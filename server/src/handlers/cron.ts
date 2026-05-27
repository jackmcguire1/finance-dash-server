import { updateTickerPrices } from "../services/coingecko";

export const handler = async (_event: unknown): Promise<void> => {
    await updateTickerPrices();
};
