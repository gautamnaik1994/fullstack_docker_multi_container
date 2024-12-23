import * as cron from 'node-cron'
import { stockPriceCollection } from '../db/conn';

type CoinData = {
    timestamp: Date;
    metadata: {
        symbol: string;
    };
    price: number;
}

type ResponseData = {
    code: string;
    rate: number;
}[]

async function getCoinData() {
    let timeSeriesArray:CoinData[] =[];
    try {
        const response = await fetch(new Request("https://api.livecoinwatch.com/coins/map"), {
            method: "POST",
            headers: new Headers({
                "content-type": "application/json",
                "x-api-key": process.env.COIN_API_KEY || "",
            }),
            body: JSON.stringify({
                codes: ["ETH", "BTC", "GRIN", "XRP", "LTC"],
                currency: "USD",
                sort: "rank",
                order: "ascending",
                offset: 0,
                limit: 0,
                meta: false,
            }),
        });

        const data:ResponseData = await response.json() as ResponseData;

        data.forEach(coin => { 
            timeSeriesArray.push({
                "timestamp": new Date(),
                "metadata": {
                    "symbol": coin["code"],
                },
                "price": coin["rate"]
            });
        });
        // console.log(timeSeriesArray);
        stockPriceCollection?.insertMany(timeSeriesArray);
        console.log('Data ingested');
    }
    catch (e) { 
        console.error("Failed to fetch coin data", e);
        throw new Error("Failed to fetch coin data");
    }
    
}
//Following function runs at specific interval and fetches the coin data from the API and ingests it into the database
function startPriceDataIngestion() {
    const ingestionRateSec = process.env.DATA_INGESTION_INTERVAL_SECONDS || 60;
    getCoinData(); //Initial call to fetch data to avoid waiting for the first interval
    cron.schedule(`*/${ingestionRateSec} * * * * *`, async () => {
        getCoinData();
    });
}

export { startPriceDataIngestion };