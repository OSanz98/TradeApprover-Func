/*eslint-disable */
const pup = require('puppeteer');

let browserPromise = pup.launch({
    headless: false,
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--window-size=1280,720',
    ],
});

async function getLinks(page: any){
    await page.goto('https://uk.finance.yahoo.com/most-active/?offset=0&count=100');
    let all_links: string[] = [];
    
    var noResults = await page.waitForXPath("/html/body/div[1]/div/div/div[1]/div/div[2]/div/div/div[6]/div/div/section/div/div[1]/div[1]/span[2]/span");
    var noMarkets: string = await page.evaluate((element:any) => element.textContent, noResults);
    var maxMarkets: number = +noMarkets.substring(
        noMarkets.indexOf("of") + 3,
        noMarkets.indexOf("results")
    );

    if(maxMarkets > 100){
        var maxOffset = (maxMarkets - (maxMarkets % 100));
        let newURL: string = "";
        let newHREFs: any[] = [];
        for(var i = 0; i < maxOffset; i += 100){
            newURL = 'https://uk.finance.yahoo.com/most-active/?offset='+ i +'&count=100';
            await page.goto(newURL);
            newHREFs = await page.$$eval('a', (links: any[]) => links.map(a => a.href));
            all_links = await returnQuoteLinks(newHREFs, all_links);
            newHREFs = [];
        }
    }else{
        const hrefs = await page.$$eval('a', (links: any[]) => links.map(a => a.href));
        all_links = await returnQuoteLinks(hrefs, all_links);
    }
    
    return all_links;
}

async function returnQuoteLinks(arr: any[], currentArr: string[]){
    let validLinks: string[] = [];
    validLinks.push(...currentArr);
    let strLink: string = "";
    arr.forEach((link: any) => {
        strLink = link.toString();
        if(strLink.includes('https://uk.finance.yahoo.com/quote/')){
            if(validLinks.includes(strLink) === false){
                validLinks.push(strLink);
            }
        }
    });
    return validLinks;
}

async function getAllData(all_links: string[]){
    const url = 'https://uk.finance.yahoo.com/most-active/';
    const browser = await browserPromise;
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url);
    var accept = ("#consent-page > div > div > div > form > div.wizard-body > div.actions.couple > button");
    await page.click(accept);

    let marketData: { [key: string] : string } = {};
    let allData: { [key:string] : any } = {};
    
    let price: string = "";
    let marketName: string = "";
    let percentage: string = "";
    let progress: string = "";

    for(var i = 0; i < all_links.length; i++){
        await page.goto(all_links[i]);
        var element = await page.waitForXPath("/html/body/div[1]/div/div/div[1]/div/div[2]/div/div/div[6]/div/div/div/div[3]/div[1]/div/fin-streamer[1]");
        price = await page.evaluate((element: any) => element.textContent, element);

        element = await page.waitForXPath("/html/body/div[1]/div/div/div[1]/div/div[2]/div/div/div[6]/div/div/div/div[2]/div[1]/div[1]/h1");
        marketName= await page.evaluate((element: any) => element.textContent, element);

        element = await page.waitForXPath("/html/body/div[1]/div/div/div[1]/div/div[2]/div/div/div[6]/div/div/div/div[3]/div[1]/div/fin-streamer[3]/span");
        percentage = await page.evaluate((element: any) => element.textContent, element);

        element = await page.waitForXPath("/html/body/div[1]/div/div/div[1]/div/div[2]/div/div/div[6]/div/div/div/div[3]/div[1]/div/fin-streamer[2]/span");
        progress = await page.evaluate((element: any) => element.textContent, element);

        marketData["price"] = price;
        marketData["percentage"] = percentage;
        marketData["progress"] = progress;

        if((marketName in allData) === false){
            allData[marketName] = marketData;
        }

        marketData = {};
        break;
    }
    
    await browser.close();
    console.log(Object.keys(allData).length);
    return allData;
}

const scrapeMostActiveMarket = async () => {
    const url = 'https://uk.finance.yahoo.com/most-active/';
    const browser = await browserPromise;
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url);
    var accept = ("#consent-page > div > div > div > form > div.wizard-body > div.actions.couple > button");
    await page.click(accept);

    const all_links: string[] = await getLinks(page);

    await browser.close();

    console.log(all_links.length);

    const allData = await getAllData(all_links);
    
    return allData;
    
}

module.exports = scrapeMostActiveMarket;
