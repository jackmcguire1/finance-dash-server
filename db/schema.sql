CREATE TABLE IF NOT EXISTS tickers (
    ticker_id                   varchar(40) PRIMARY KEY,
    ticker_name                 varchar(40),
    symbol                      varchar(40),
    current_price               numeric,
    current_price_usd           numeric,
    current_price_eur           numeric,
    twenty_four_hour_change     numeric,
    market_cap                  numeric,
    volume                      numeric,
    image_url                   varchar(400),
    coin_id                     varchar(40)
);

CREATE TABLE IF NOT EXISTS ticker_prices (
    tp_id                       varchar(40) PRIMARY KEY,
    ticker_id                   varchar(40),
    datetime                    timestamp,
    price                       numeric,
    price_usd                   numeric,
    price_eur                   numeric,
    twenty_four_hour_change     numeric,
    market_cap                  numeric,
    volume                      numeric,
    last_updated                timestamp,
    CONSTRAINT fk_ticker_tp
        FOREIGN KEY (ticker_id) REFERENCES tickers(ticker_id)
);

CREATE TABLE IF NOT EXISTS holdings (
    holding_id                  varchar(40) PRIMARY KEY,
    account_id                  varchar(40),
    ticker_id                   varchar(40),
    color                       varchar(7),
    CONSTRAINT fk_ticker_h
        FOREIGN KEY (ticker_id) REFERENCES tickers(ticker_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    tx_id                       varchar(40) PRIMARY KEY,
    holding_id                  varchar(40),
    datetime                    timestamp,
    buy_sell                    varchar(10),
    units                       numeric,
    price                       numeric,
    CONSTRAINT fk_holding_tx
        FOREIGN KEY (holding_id) REFERENCES holdings(holding_id)
);

CREATE OR REPLACE VIEW get_holding_view AS
    SELECT
        holdings.holding_id             AS holding_id,
        tickers.ticker_name             AS ticker_name,
        tickers.symbol                  AS ticker_symbol,
        tickers.current_price           AS current_price,
        tickers.current_price_usd       AS current_price_usd,
        tickers.current_price_eur       AS current_price_eur,
        tickers.twenty_four_hour_change AS twenty_four_hour_change,
        tickers.market_cap              AS market_cap,
        tickers.volume                  AS volume,
        tickers.image_url               AS image_url,
        tickers.coin_id                 AS coin_id,
        tickers.ticker_id               AS ticker_id,
        holdings.color                  AS color,
        holdings.account_id             AS account_id
    FROM holdings
        INNER JOIN tickers ON holdings.ticker_id = tickers.ticker_id;

CREATE OR REPLACE VIEW list_holdings_view AS
    SELECT DISTINCT ON (h)
        h.holding_id                AS holding_id,
        t.ticker_name               AS ticker_name,
        t.symbol                    AS ticker_symbol,
        t.image_url                 AS ticker_logo,
        p.price                     AS ticker_price,
        p.price_usd                 AS ticker_price_usd,
        p.price_eur                 AS ticker_price_eur,
        p.twenty_four_hour_change   AS ticker_twenty_four_change,
        p.last_updated              AS ticker_last_updated,
        h.account_id                AS account_id
    FROM holdings h
        JOIN tickers t ON h.ticker_id = t.ticker_id
        JOIN (
            SELECT C.*, row_number() OVER (
                PARTITION BY C.ticker_id ORDER BY C.datetime DESC
            ) AS rn
            FROM ticker_prices C
        ) p ON p.ticker_id = t.ticker_id AND p.rn = 1;
