const axios = require("axios");
const fs = require("fs");
const { Parser } = require('json2csv');
const nodeCron = require('node-cron')
const mongodb = require('mongodb')
const cheerio = require('cheerio');
const { children, eq, first } = require('cheerio/lib/api/traversing');


// "URL","Image","Name","Brand","Capacity","Star","Rating","Price","Discount"


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

      const response = await axios.get(`https://www.flipkart.com/air-coolers/pr?sid=j9e%2Cabm%2C52j&otracker[]=categorytree&otracker[]=nmenu_sub_TVs%20%26%20Appliances_0_Air%20Coolers&page=${pageNo}`, {
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

        const a_element = $(el).find('._2rpwqI');
        const url = "www.flipkart.com" + a_element.attr('href');
        const image = a_element.find('img:first').attr('src');
        const name = a_element.next().text();
        const name_list = name.split(" ");
        const brand = name_list[0];
        let capacity = "NULL";
        let i = 1;
        while(i < name_list.length && isNaN(name_list[i][0])) {
            i += 1;
        }
        if(i < name_list.length) {
            capacity = name_list[i];
        }
        

        const star_and_rating_section = $(el).find('.gUuXy-._2D5lwg');
        let star = star_and_rating_section.find('._3LWZlK').eq(0).text();
        let rating = star_and_rating_section.find('._2_R_DZ').text().replace(/[()]/g,'');
        if(!star_and_rating_section.html()) {
            star = rating = 'NULL';
        }

        const price = $(el).find('._30jeq3').text();
        let discount = $(el).find('._3Ay6Sb').text();
        if(!discount) {
            discount = "NULL";
        }

        data.push({
            URL: url,
            Image: image,
            Name: name,
            Brand: brand,
            Capacity: capacity,
            Star: star,
            Rating: rating,
            Price: price,
            Discount: discount,
        });
      });

      console.log(`Page No:${pageNo}`);
      if(countOfItems <= 1) break;
      pageNo += 1;
    }


    // const parser = new Parser();
    // const csv = parser.parse(data);
    // fs.writeFileSync('./flipkart_cooler.csv',csv,"utf-8"); 


    const collectionName = 'flipkartCooler';
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
