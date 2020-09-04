const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const args = require("minimist")(process.argv.slice(2), {
  default: {
    country: '',
    category: 'import-export',
    begin: 1,
    end: 100,
  },
});

const csvWriter = createCsvWriter({
    path: './res.csv',
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'url', title: 'URL'},
        {id: 'country', title: 'COUNTRY'},
        {id: 'phone', title: 'PHONE'},
    ],
    append: true,
});

(async () => {
  const browser = await puppeteer.launch();

  async function getEntrepriseInfos(link) {
    const page = await browser.newPage();
    let infos = {}
    try {
      await page.goto(link)
      infos.name = await page.evaluate(() => document.querySelector('span.comp')?.textContent)
      infos.url = await page.evaluate(() => document.querySelector('a.compUrl')?.href)
      infos.phone = await page.evaluate(async () => {
        const sleep = m => new Promise(r => setTimeout(r, m))
        document.querySelector('.click-tel > a').click()
        await sleep(200)
        return document.querySelector('.info-tel-num')?.textContent
      })
      infos.country = await page.evaluate(() => document.querySelector('dd[itemprop=addressCountry] > span')?.textContent)
    } catch (err) {
      console.error(`Can't scrap company ${link}`)
    } finally {
      await page.close()
      return infos
    }
  }

  async function getEntrepriseList(pageNumber) {
    const page = await browser.newPage();
    const { category, country } = args
    let infos = []
    try {
      const url = `https://www.europages.co.uk/companies/${country}/pg-${pageNumber}/${category}.html`
      await page.goto(url)
      const entreprises = await page.evaluate(() => Array.from(document.querySelectorAll('a.company-name'), element => element.href));
      infos = await Promise.all(entreprises.map(getEntrepriseInfos))
    } catch (err) {
      console.error(err)
    } finally {
      await page.close()
      return infos
    }
  }

  try {
    for (let i = args.begin; i <= args.end; i += 1) {
      const data = await getEntrepriseList(i)
      await csvWriter.writeRecords(data)
    }
  } catch (err) {
    console.log(err)
  }

  await browser.close();
})();
