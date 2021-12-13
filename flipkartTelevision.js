const axios = require("axios");
const fs = require("fs");
const { Parser } = require('json2csv');
const nodeCron = require('node-cron')
const mongodb = require('mongodb')
const cheerio = require('cheerio');
const { children, eq, first } = require('cheerio/lib/api/traversing');


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

    while(found && pageNo <= 10) {
      found = false;

      const response = await axios.get(encodeURI(`https://www.flipkart.com/televisions/pr?sid=ckf,czl&p[]=facets.fulfilled_by%255B%255D[…]]=facets.offer_type%255B%255D%3D&wid=18.productCard.PMU_V2_9&page=${pageNo}`), {
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
        let size = "NULL";
        var brackets = name.match(/\((.*?)\)/);
        if (brackets) {
          size = brackets[0].replace(/[()]/g,'');
        }

        const rating_and_review_section = (a_element.find('._3pLy-c > div').find('.gUuXy-')).html();
        const rating_and_reviews = $(rating_and_review_section).find('._13vcmD')
        
        let star = $(rating_and_review_section).find('._3LWZlK').eq(0).text();
        let rating = rating_and_reviews.prev().text().replace(/(&nbsp;)*/g, '').split(" ")[0].trim();
        let review = rating_and_reviews.next().text().replace(/(&nbsp;)*/g, '').split(" ")[0].trim();

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
            Size: size,
            Star: star,
            Rating: rating,
            Review: review,
            Price: price,
            Discount: discount
        });
      });

      console.log(`Page No:${pageNo}`);
      if(countOfItems <= 1) break;
      pageNo += 1;
    }


    // const parser = new Parser();
    // const csv = parser.parse(data);
    // fs.writeFileSync('./flipkart_television.csv',csv,"utf-8"); 


    const collectionName = 'flipkartTelevision';
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
