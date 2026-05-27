import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as path from 'path';

const config = new pulumi.Config();
const region = aws.config.region ?? 'eu-west-2';

// ---------------------------------------------------------------------------
// VPC
// ---------------------------------------------------------------------------
const vpc = new aws.ec2.Vpc('vpc', {
    cidrBlock: '10.0.0.0/24',
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: 'finance-dash-vpc' },
});

const igw = new aws.ec2.InternetGateway('igw', {
    vpcId: vpc.id,
    tags: { Name: 'finance-dash-igw' },
});

const publicRouteTable = new aws.ec2.RouteTable('public-rt', {
    vpcId: vpc.id,
    routes: [{ cidrBlock: '0.0.0.0/0', gatewayId: igw.id }],
    tags: { Name: 'finance-dash-public-rt' },
});

const az1 = aws.getAvailabilityZonesOutput({ state: 'available' });

const subnet1 = new aws.ec2.Subnet('subnet-1', {
    vpcId: vpc.id,
    cidrBlock: '10.0.0.0/26',
    availabilityZone: az1.names[0],
    mapPublicIpOnLaunch: true,
    tags: { Name: 'finance-dash-subnet-1' },
});

const subnet2 = new aws.ec2.Subnet('subnet-2', {
    vpcId: vpc.id,
    cidrBlock: '10.0.0.64/26',
    availabilityZone: az1.names[1],
    mapPublicIpOnLaunch: true,
    tags: { Name: 'finance-dash-subnet-2' },
});

new aws.ec2.RouteTableAssociation('rta-1', { subnetId: subnet1.id, routeTableId: publicRouteTable.id });
new aws.ec2.RouteTableAssociation('rta-2', { subnetId: subnet2.id, routeTableId: publicRouteTable.id });

// ---------------------------------------------------------------------------
// Security groups
// ---------------------------------------------------------------------------
const rdsSecurityGroup = new aws.ec2.SecurityGroup('rds-sg', {
    vpcId: vpc.id,
    description: 'Allow PostgreSQL access',
    ingress: [{ protocol: 'tcp', fromPort: 5432, toPort: 5432, cidrBlocks: ['0.0.0.0/0'] }],
    egress: [{ protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] }],
    tags: { Name: 'finance-dash-rds-sg' },
});

const lambdaSecurityGroup = new aws.ec2.SecurityGroup('lambda-sg', {
    vpcId: vpc.id,
    description: 'Lambda outbound access',
    egress: [{ protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] }],
    tags: { Name: 'finance-dash-lambda-sg' },
});

// ---------------------------------------------------------------------------
// RDS — PostgreSQL 16, t3.micro
// ---------------------------------------------------------------------------
const dbSubnetGroup = new aws.rds.SubnetGroup('db-subnet-group', {
    subnetIds: [subnet1.id, subnet2.id],
    tags: { Name: 'finance-dash-db-subnet-group' },
});

const rdsInstance = new aws.rds.Instance('postgres', {
    engine: 'postgres',
    engineVersion: '16',
    instanceClass: 'db.t3.micro',
    allocatedStorage: 20,
    dbName: 'financedashdb',
    username: 'postgres',
    password: config.requireSecret('dbPassword'),
    dbSubnetGroupName: dbSubnetGroup.name,
    vpcSecurityGroupIds: [rdsSecurityGroup.id],
    publiclyAccessible: true,
    backupRetentionPeriod: 0,
    skipFinalSnapshot: true,
    tags: { Name: 'finance-dash-postgres' },
});

// ---------------------------------------------------------------------------
// IAM role for Lambda functions
// ---------------------------------------------------------------------------
const lambdaRole = new aws.iam.Role('lambda-role', {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: 'lambda.amazonaws.com' }),
});

new aws.iam.RolePolicyAttachment('lambda-basic', {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
});

// ---------------------------------------------------------------------------
// Server build — zip the dist/ directory
// ---------------------------------------------------------------------------
const serverAsset = new pulumi.asset.FileArchive(path.join(__dirname, '..', 'server'));

// ---------------------------------------------------------------------------
// API Lambda (Lambda Web Adapter)
// ---------------------------------------------------------------------------
const LWA_LAYER = `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerArm64:26`;

const apiLambda = new aws.lambda.Function('api', {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: 'run.sh',
    code: serverAsset,
    role: lambdaRole.arn,
    architectures: ['arm64'],
    timeout: 29,
    memorySize: 512,
    layers: [LWA_LAYER],
    vpcConfig: {
        subnetIds: [subnet1.id, subnet2.id],
        securityGroupIds: [lambdaSecurityGroup.id],
    },
    environment: {
        variables: {
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
            PORT: '8080',
            PGHOST: rdsInstance.address,
            PGUSER: 'postgres',
            PGPASSWORD: config.requireSecret('dbPassword'),
            PGDATABASE: 'financedashdb',
            PGPORT: '5432',
        },
    },
    tags: { Name: 'finance-dash-api' },
});

const apiFunctionUrl = new aws.lambda.FunctionUrl('api-url', {
    functionName: apiLambda.name,
    authorizationType: 'NONE',
    cors: {
        allowOrigins: ['*'],
        allowMethods: ['*'],
        allowHeaders: ['content-type', 'authorization'],
    },
});

// ---------------------------------------------------------------------------
// Cron Lambda (EventBridge → ticker price updates)
// ---------------------------------------------------------------------------
const cronLambda = new aws.lambda.Function('cron', {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: 'dist/handlers/cron.handler',
    code: serverAsset,
    role: lambdaRole.arn,
    architectures: ['arm64'],
    timeout: 120,
    memorySize: 256,
    vpcConfig: {
        subnetIds: [subnet1.id, subnet2.id],
        securityGroupIds: [lambdaSecurityGroup.id],
    },
    environment: {
        variables: {
            PGHOST: rdsInstance.address,
            PGUSER: 'postgres',
            PGPASSWORD: config.requireSecret('dbPassword'),
            PGDATABASE: 'financedashdb',
            PGPORT: '5432',
        },
    },
    tags: { Name: 'finance-dash-cron' },
});

const cronRule = new aws.cloudwatch.EventRule('ticker-cron', {
    scheduleExpression: 'rate(10 minutes)',
    description: 'Update ticker prices every 10 minutes',
});

new aws.cloudwatch.EventTarget('ticker-cron-target', {
    rule: cronRule.name,
    arn: cronLambda.arn,
});

new aws.lambda.Permission('cron-invoke-permission', {
    action: 'lambda:InvokeFunction',
    function: cronLambda.name,
    principal: 'events.amazonaws.com',
    sourceArn: cronRule.arn,
});

// ---------------------------------------------------------------------------
// S3 + CloudFront (frontend)
// ---------------------------------------------------------------------------
const siteBucket = new aws.s3.BucketV2('site-bucket', {
    forceDestroy: true,
    tags: { Name: 'finance-dash-site' },
});

new aws.s3.BucketOwnershipControls('site-ownership', {
    bucket: siteBucket.id,
    rule: { objectOwnership: 'BucketOwnerPreferred' },
});

new aws.s3.BucketPublicAccessBlock('site-public-access', {
    bucket: siteBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

new aws.s3.BucketWebsiteConfigurationV2('site-website', {
    bucket: siteBucket.id,
    indexDocument: { suffix: 'index.html' },
    errorDocument: { key: 'index.html' },
});

const oac = new aws.cloudfront.OriginAccessControl('site-oac', {
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
});

const distribution = new aws.cloudfront.Distribution('cdn', {
    enabled: true,
    defaultRootObject: 'index.html',
    origins: [{
        originId: 'S3Origin',
        domainName: siteBucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
    }],
    defaultCacheBehavior: {
        targetOriginId: 'S3Origin',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD'],
        cachedMethods: ['GET', 'HEAD'],
        forwardedValues: { queryString: false, cookies: { forward: 'none' } },
    },
    customErrorResponses: [
        { errorCode: 404, responseCode: 200, responsePagePath: '/index.html' },
        { errorCode: 403, responseCode: 200, responsePagePath: '/index.html' },
    ],
    restrictions: { geoRestriction: { restrictionType: 'none' } },
    viewerCertificate: { cloudfrontDefaultCertificate: true },
    tags: { Name: 'finance-dash-cdn' },
});

// Allow CloudFront to read from the bucket
const bucketPolicy = pulumi.all([siteBucket.id, distribution.id]).apply(([bucketId, distId]) =>
    JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
            Sid: 'AllowCloudFront',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucketId}/*`,
            Condition: { StringEquals: { 'AWS:SourceArn': `arn:aws:cloudfront::${aws.getCallerIdentityOutput().accountId}:distribution/${distId}` } },
        }],
    })
);

new aws.s3.BucketPolicy('site-bucket-policy', {
    bucket: siteBucket.id,
    policy: bucketPolicy,
});

// ---------------------------------------------------------------------------
// Cognito
// ---------------------------------------------------------------------------
const userPool = new aws.cognito.UserPool('user-pool', {
    accountRecoverySetting: {
        recoveryMechanisms: [{ name: 'verified_email', priority: 1 }],
    },
    autoVerifiedAttributes: ['email'],
    tags: { Name: 'finance-dash-user-pool' },
});

const userPoolClient = new aws.cognito.UserPoolClient('user-pool-client', {
    userPoolId: userPool.id,
    allowedOauthFlows: ['implicit'],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ['openid', 'email', 'profile'],
    callbackUrls: [pulumi.interpolate`https://${distribution.domainName}/dashboard`],
    supportedIdentityProviders: ['COGNITO'],
});

const userPoolDomain = new aws.cognito.UserPoolDomain('user-pool-domain', {
    domain: 'finance-dash-server',
    userPoolId: userPool.id,
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
export const apiEndpoint = apiFunctionUrl.functionUrl;
export const bucketName = siteBucket.bucket;
export const distributionId = distribution.id;
export const distributionDomain = distribution.domainName;
export const cognitoUserPoolId = userPool.id;
export const cognitoClientId = userPoolClient.id;
export const dbHost = rdsInstance.address;
