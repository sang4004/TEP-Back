import fs from "fs";
import puppeteer, { ScreenshotOptions } from "puppeteer";

export const html2img = async (html: string, opt?: ScreenshotOptions) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ height: 1528, width: 1080 });
    await page.setContent(html);
    const content = await page.$("body");

    const imageBuffer = await content.screenshot({ omitBackground: true, ...opt });
    const size = await content.boundingBox();
    await page.close();
    await browser.close();

    return { image: imageBuffer, size: size };
};
