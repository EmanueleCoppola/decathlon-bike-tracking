const fs = require('fs');
const path = require('path');

const axios = require('axios');
const cheerio = require('cheerio');
const { Telegraf } = require('telegraf');

const CONFIG = require(path.resolve(__dirname, './config.json'));

const OLD_AVAILABILITY = require(path.resolve(__dirname, './availability.json'));
let   NEW_AVAILABILITY = OLD_AVAILABILITY;

const TELEGRAM_BOT_TOKEN   = CONFIG['TELEGRAM_BOT_TOKEN'];
const TELEGRAM_BOT_CHANNEL = CONFIG['TELEGRAM_BOT_CHANNEL'];

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_CHANNEL) process.exit(1);

const WAIT_GET = 3*1000;
const WAIT_XHR = 800;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const TELEGRAM = new Telegraf(TELEGRAM_BOT_TOKEN);

    /**
     * Script to take all the links of a page.
     * Run in the browser console.
     *
     *      Array.from(new Set($('.pl-element .title a, .dkt-product a').toArray().map((el) => el.href))).map((el) => console.log(el));
     */

    const PRODUCTS = [
        // ELOPS 120
        'https://www.decathlon.it/p/bici-citta-elops-120-telaio-alto-azzurra/_/R-p-168865',
        'https://www.decathlon.it/p/bici-citta-elops-120-telaio-basso-azzurra/_/R-p-168864',

        // BDC
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc-500-fb/_/R-p-306215',
        'https://www.decathlon.it/p/bici-da-corsa-rc120/_/R-p-302301',
        'https://www.decathlon.it/p/bici-corsa-donna-triban-easy/_/R-p-301919',
        'https://www.decathlon.it/p/bici-da-corsa-edr-cf-105-nera/_/R-p-324411',
        'https://www.decathlon.it/p/bici-da-corsa-edr-af-ultegra-bianco-nero/_/R-p-311959',
        'https://www.decathlon.it/p/bici-da-corsa-ultra-cf-azzurra/_/R-p-300815',
        'https://www.decathlon.it/p/bici-da-corsa-ultra-cf-ultegra-di2-azzurra/_/R-p-300789',
        'https://www.decathlon.it/p/bici-da-corsa-ultra-cf-nera/_/R-p-301058',
        'https://www.decathlon.it/p/bici-da-corsa-bambino-9-12-anni-triban-500-26/_/R-p-300985',
        'https://www.decathlon.it/p/bici-da-corsa-edr-af-105-nera/_/R-p-305449',
        'https://www.decathlon.it/p/bici-gravel-a-pedalata-assistita-e-windee/_/R-p-X8626797',
        'https://www.decathlon.it/p/bici-da-corsa-van-rysel-edr-cf-ultegra-nera/_/R-p-324426',
        'https://www.decathlon.it/p/bici-gravel-donna-grvlw-120/_/R-p-328330',
        'https://www.decathlon.it/p/bici-gravel-triban-grvl-120/_/R-p-312397',
        'https://www.decathlon.it/p/bici-gravel-donna-grvl-520/_/R-p-328031',
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc-500-nera/_/R-p-301728',
        'https://www.decathlon.it/p/bici-gravel-uomo-grvl-520/_/R-p-313016',
        'https://www.decathlon.it/p/bici-da-corsa-edr-920-cf-ultegra-nera/_/R-p-305451',
        'https://www.decathlon.it/p/bici-da-corsa-uomo-rc100-slick-edition/_/R-p-325795',
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc520-fb/_/R-p-307286',
        'https://www.decathlon.it/p/bici-da-corsa-edr-cf-centaur-nera/_/R-p-335019',
        'https://www.decathlon.it/p/bici-da-corsa-donna-edr-af-105-blu/_/R-p-313178',
        'https://www.decathlon.it/p/bici-da-corsa-donna-triban-regular/_/R-p-302724',
        'https://www.decathlon.it/p/bici-da-corsa-donna-rc520/_/R-p-301713',
        'https://www.decathlon.it/p/bici-da-corsa-rc120-fb-blu-arancione/_/R-p-311239',
        'https://www.decathlon.it/p/bici-da-corsa-bambino-9-12-anni-triban-100-26/_/R-p-332056',
        'https://www.decathlon.it/p/bici-da-corsa-ultra-cf-900-105-nera/_/R-p-301046',
        'https://www.decathlon.it/p/bici-donna-triban-regular/_/R-p-168772',
        'https://www.decathlon.it/p/kit-telaio-bici-da-corsa-ultra-cf/_/R-p-307212',
        'https://www.decathlon.it/p/bici-gravel-triban-rc-520/_/R-p-302303',
        'https://www.decathlon.it/p/bici-da-corsa-uomo-rc100-grigia/_/R-p-305831',
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc520/_/R-p-301734',
        'https://www.decathlon.it/p/bici-da-corsa-edr-940-cf-dura-ace-rossa/_/R-p-311428',
        'https://www.decathlon.it/p/bici-da-corsa-donna-edr-105/_/R-p-327988',
        'https://www.decathlon.it/p/bici-da-corsa-donna-ultra-rcr-cf-ultegra-di2/_/R-p-312040',
        'https://www.decathlon.it/p/bici-ciclocross-rcx-van-rysel-grx-1x/_/R-p-324261',
        'https://www.decathlon.it/p/bici-gravel-uomo-grvl-520-subcompact/_/R-p-313015',
        'https://www.decathlon.it/p/bici-gravel-van-rysel-edr-offroad-grx-1x/_/R-p-327757',
        
        // MTB
        'https://www.decathlon.it/p/mtb-st-100-grigia-27-5/_/R-p-192872',
        'https://www.decathlon.it/p/mtb-st-120-27-5/_/R-p-305496',
        'https://www.decathlon.it/p/mtb-xc-900-carbonio-rosso-nero-29/_/R-p-300807',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-e-st-100-azzurra-27-5/_/R-p-309736',
        'https://www.decathlon.it/p/mtb-st-50-nera-26/_/R-p-310069',
        'https://www.decathlon.it/p/mtb-a-pedalata-assistita-donna-e-st-900-turchese-27-5/_/R-p-308514',
        'https://www.decathlon.it/p/mtb-xc-100-s-12s-29/_/R-p-304208',
        'https://www.decathlon.it/p/mtb-st-540-v2-azzurra-27-5/_/R-p-335529',
        'https://www.decathlon.it/p/mtb-rockrider-xc-500-s-29-carbonio-full-suspended/_/R-p-325050',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-e-bike-rockrider-e-st-520-grigio-giallo-27-5/_/R-p-311400',
        'https://www.decathlon.it/p/mtb-semirigida-rockrider-xc-100-29-deore/_/R-p-330066',
        'https://www.decathlon.it/p/mtb-donna-st-530-turchese-27-5/_/R-p-310525',
        'https://www.decathlon.it/p/mtb-st-530-grigia-27-5/_/R-p-311274',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-e-st-900-grigia-27-5-plus/_/R-p-168875',
        'https://www.decathlon.it/p/mtb-donna-st-120-blu-27-5/_/R-p-305610',
        'https://www.decathlon.it/p/mtb-st-540-grigio-rosso-27-5/_/R-p-301097',
        'https://www.decathlon.it/p/mtb-donna-st-100-bianco-rosa-27-5/_/R-p-300809',
        'https://www.decathlon.it/p/mtb-rockrider-xc-920-s-ltd-29-carbonio/_/R-p-331705',
        'https://www.decathlon.it/p/mtb-st-530-s-nero-rosso-27-5/_/R-p-311716',
        'https://www.decathlon.it/p/mtb-donna-st-900-bianca-27-5/_/R-p-301121',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-donna-e-st-500-azzurra-27-5/_/R-p-310848',
        'https://www.decathlon.it/p/mtb-am-100-s-29/_/R-p-309661',
        'https://www.decathlon.it/p/mtb-xc-500-29-12v/_/R-p-304245',
        'https://www.decathlon.it/p/mtb-st-900-s-grigio-giallo-27-5/_/R-p-301099',
        'https://www.decathlon.it/p/mtb-st-520-v2-nera-27-5/_/R-p-324884',
        'https://www.decathlon.it/p/mtb-donna-st-540-grigio-rosa-27-5/_/R-p-307942',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-e-st-500-v2-nero-azzurro-27-5/_/R-p-310922',
        'https://www.decathlon.it/p/mtb-st-540-s-blu-arancione-27-5/_/R-p-301117',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-donna-e-st520-nera-27-5/_/R-p-311573',
        'https://www.decathlon.it/p/mtb-st-900-27-5/_/R-p-301098',
        'https://www.decathlon.it/p/mtb-elettrica-a-pedalata-assistita-donna-e-st100-bianca-27-5/_/R-p-311489',

        // TREKKING
        'https://www.decathlon.it/p/bici-trekking-a-pedalata-assistita-original-920-e/_/R-p-325430',
        'https://www.decathlon.it/p/bici-trekking-a-pedalata-assistita-riverside-500-e/_/R-p-169143',
        'https://www.decathlon.it/p/bici-trekking-riverside-920/_/R-p-300795',
        'https://www.decathlon.it/p/bici-trekking-a-pedalata-assistita-riverside-540-e-azzurro/_/R-p-330244',
        'https://www.decathlon.it/p/bici-trekking-riverside-900/_/R-p-300794',
        'https://www.decathlon.it/p/bici-trekking-riverside-100-nera/_/R-p-300787',
        'https://www.decathlon.it/p/bici-trekking-riverside-500/_/R-p-300777',
        'https://www.decathlon.it/p/bici-da-viaggio-riverside-touring-520/_/R-p-312723',
        'https://www.decathlon.it/p/bici-trekking-riverside-120-grigia/_/R-p-300806',
        'https://www.decathlon.it/p/bici-trekking-riverside-120/_/R-p-335831',

        // WRONG CATEGORY
        'https://www.decathlon.it/p/bici-da-viaggio-riverside-touring-920/_/R-p-332473'
    ];

    for (let productUrl of PRODUCTS) {
        try {
            let page = await axios.get(productUrl);
            let $ = cheerio.load(page.data);

            let _ctx = JSON.parse($('#__dkt').html());

            let models = _ctx['_ctx']['data'].find((datum) => datum.type === 'Supermodel')['data']['models'];

            for (let model of models) {
                let message = '';

                let skus  = model['skus'].map((item) => Number(item['skuId']));
                let sizes = Object.fromEntries(model['skus'].map((item) => [Number(item['skuId']), item['size']]));

                let availabilityUrl = 'https://www.decathlon.it/it/ajax/nfs/stocks/online?skuIds=' + skus.join(',');
                await sleep(WAIT_XHR);

                let availabilityJson = await axios.get(availabilityUrl);
                    availabilityJson = availabilityJson.data;

                message += `${model['webLabel']} \n\n`;

                let shouldNotifyProduct = false;

                for (let sku in availabilityJson) {
                    if (!availabilityJson.hasOwnProperty(sku)) continue;

                    let hasOldAvailability = sku in OLD_AVAILABILITY;
                    let oldAvailability    = hasOldAvailability ? OLD_AVAILABILITY[sku] : 0;
                    let newAvailability    = availabilityJson[sku]['stockOnline'];

                    availabilityJson[sku] = availabilityJson[sku]['stockOnline'];

                    NEW_AVAILABILITY[sku] = newAvailability;

                    if (oldAvailability === 0 && newAvailability > 0 && hasOldAvailability) {
                        shouldNotifyProduct = true;

                        message += `- ${sizes[sku]}: ${newAvailability} ${newAvailability === 1 ? 'pezzo disponibile' : 'pezzi disponibili'}\n`;
                    }
                }

                message += `\n`;
                message += `${productUrl}\n`;

                if (shouldNotifyProduct) {
                    TELEGRAM.telegram.sendMessage(TELEGRAM_BOT_CHANNEL, message);
                }
            }
        } catch (e) {
            console.warn(`Error on URL: ${productUrl}`);
        }

        await sleep(WAIT_GET);
    }

    fs.writeFileSync(path.resolve(__dirname, './availability.json'), JSON.stringify(NEW_AVAILABILITY));
})();

