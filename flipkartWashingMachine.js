const axios = require("axios");
const fs = require("fs");
const { Parser } = require('json2csv');
const nodeCron = require('node-cron')
const mongodb = require('mongodb')
const cheerio = require('cheerio');
const { children, eq, first } = require('cheerio/lib/api/traversing');

// Name, URL, image, star, reviews, Price, discount, capacity, type

const url = 'mongodb+srv://vishalCitymall:vishal12345@cluster0.v408j.mongodb.net/test';
var dbConn;
var dbClient;

async function find() {
  try {
    let pageNo = 1;
    const data = [];
    let found = true;
    
    const client = await mongodb.MongoClient.connect(url, {
        useUnifiedTopology: true,
    })
    console.log('DB Connected!');
    dbConn = await client.db();
    dbClient = client;

    while(found && pageNo <= 100) {
      found = false;
      console.log('Page No:',pageNo)
      const response = await axios.get(`https://www.flipkart.com/washing-machines/pr?sid=j9e%2Cabm%2C8qx&fm=neo%2Fmerchandising&iid=M_7d9a09b7-273f-459d-bd28-74e6e47c64ef_1_372UD5BXDFYS_MC.MWW5PQN4XAEH&otracker=hp_rich_navigation_1_1.navigationCard.RICH_NAVIGATION_Appliances~Washing%2BMachines~All_MWW5PQN4XAEH&otracker1=hp_rich_navigation_PINNED_neo%2Fmerchandising_NA_NAV_EXPANDABLE_navigationCard_cc_1_L2_view-all&cid=MWW5PQN4XAEH&page=${pageNo}`, {
        headers: {
          "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language":"en-US,en;q=0.5"
        },
        gzip: true,
      });

      const $ = cheerio.load(response.data);

      let countOfItems = 0;
      $('div[class="_1AtVbE col-12-12"] > div[class="_13oc-S"] > div').each(function (idx, el) {
        countOfItems += 1;
        found = true;

        const a_element = $(el).find('div:first').children('a');
        const url = "www.flipkart.com"+a_element.attr('href');
        const image = a_element.find('img:first').attr('src');
        const name = a_element.find('._3pLy-c > div > div:eq(0)').text();
        const name_list = name.split(" ");
        const brand = name_list[0];
        let capacity = "NULL";
        let i = 1;
        while(i < name_list.length && isNaN(name_list[i][0])){
            i += 1;
        }
        if(i < name_list.length)
          capacity = name_list[i];
        
        const rating_and_review_section = (a_element.find('.gUuXy-')).html();
        const rating_and_reviews = $(rating_and_review_section).find('._13vcmD')
        
        let star = $(rating_and_review_section).find('._3LWZlK').eq(0).text();
        let rating = rating_and_reviews.prev().text().replace(/(&nbsp;)*/g, '').split(" ")[0].trim();
        let review = rating_and_reviews.next().text().replace(/(&nbsp;)*/g, '').split(" ")[0].trim();
        const type = (a_element.find('.fMghEO > ul > li:first')).text();
        
        if(!rating_and_review_section) {
          star = rating = review = 'NULL';
        }

        const price_section = a_element.find('._25b18c').html();
        const price = $(price_section).eq(0).text().trim();
        let discount = $(price_section).eq(2).children(0).text().split(" ")[0].trim();
        if(!discount) {
          discount = "NULL";
        }
        
        data.push({
          URL: url,
          Image: image,
          Name: name,
          Brand: brand,
          Capacity: capacity,
          Type: type,
          Star: star,
          Rating: rating,
          Review: review,
          Price: price,
          Discount: discount
        });
      });

      if(countOfItems <= 1) break;
      pageNo += 1;
    }
      
    // const parser = new Parser();
    // const csv = parser.parse(data);
    // fs.writeFileSync('./flipkart_data.csv',csv,"utf-8"); 
    
    const collectionName = 'flipkartWashingMachine';
    const collection = dbConn.collection(collectionName);

    collection.deleteMany({});
    collection.insertMany(data, (err, result) => {
       if (err) console.log(err);
       if(result){
          console.log('Import CSV into database successfully.');
          console.log('Number of documents inserted: ' + result.insertedCount);
          dbClient.close();
        }
    });
    
  } catch (error) {
    console.error(error);
  }
}

nodeCron.schedule("0 0 */1 * *", find);