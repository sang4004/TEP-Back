const puppeteer = require("puppeteer");
const path = require("path");

module.exports = async function html3img(html, opt) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ height: 1528, width: 1080 });
    await page.setContent(html, { waitUntil : 'networkidle2' });

    const content = await page.$(".form_wrapper");
    await page.evaluate(() => {
        var el = document.getElementById("top_style");
        if (el) {
            el.setAttribute(
                "style",
                `width:1080px; margin:0; line-height: 160%; height: ${document.body.scrollHeight}px`
            );
        }
    });
    const size = await content.boundingBox();
    console.log(size);
    const imageBuffer = await content.screenshot({ ...opt });
    await page.close();
    await browser.close();

    return { image: imageBuffer, size: size };
};
