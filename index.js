const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const fs = require('fs');
const { children, eq, first } = require('cheerio/lib/api/traversing');


(async () => {
  try {
    let pageNo = 1;
    const data = [];
    let found = true;

    while(found && pageNo <= 50) {
      found = false;

      const response = await axios.get(`https://www.flipkart.com/refrigerators/pr?sid=j9e,abm,hzg&otracker=categorytree&page=${pageNo}`, {
        headers: {
          "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language":"en-US,en;q=0.5"
        }
      });
      const $ = cheerio.load(response.data);
      
      $('div[class="_1AtVbE col-12-12"] > div[class="_13oc-S"] > div').each(function (idx, el) {
        found = true;
        const a_element = $(el).find('div:first').children('a');
        const url = "www.flipkart.com"+a_element.attr('href');
        const image = a_element.find('img:first').attr('src');
        const name = a_element.find('._3pLy-c > div > div:eq(0)').text();
        const name_list = name.split(" ");
        const brand = name_list[0];
        let i = 1;
        while(isNaN(name_list[i])){
            i+=1
        }
        const capacity = name_list[i];

        const rating_and_review_section = (a_element.find('._3pLy-c > div').find('.gUuXy-')).html();
        const rating_and_reviews = $(rating_and_review_section).find('._13vcmD')
        
        let star = $(rating_and_review_section).find('._3LWZlK').eq(0).text();
        let rating = rating_and_reviews.prev().text().replace(/(&nbsp;)*/g, '').split(" ")[0];
        let review = rating_and_reviews.next().text().replace(/(&nbsp;)*/g, '').split(" ")[0];

        if(!rating_and_review_section) {
            star = rating = review = 'NULL';
        }

        const price_section = a_element.find('._25b18c').html();
        const price = $(price_section).eq(0).text();
        let discount = $(price_section).eq(2).children(0).text().split(" ")[0];
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
            Review: review,
            Price: price,
            Discount: discount
        });
      });


      console.log(`Page No:${pageNo}`);
      pageNo += 1;
    }

    const parser = new Parser();
    const csv = parser.parse(data);
    fs.writeFileSync('./flipkart_data.csv',csv,"utf-8"); 

  } catch (error) {
    console.error(error);
  }
})(); 


//   // Everything except last row
//   $('div[class="sc-dkPtRN ProductList__GridCol-sc-8lnc8o-0 FjWWx jMkQHN"]').each(function (idx, el) {
//     found = true;
//     let img = $(el).find('noscript').html();
//     if(img === null)
//       img = $(el).find('img').attr('src');
//     else
//       img = $(img).attr('src');

//     let name = $(el).find('p[class="Text__StyledText-sc-oo0kvp-0 bWSOET NewProductCard__ProductTitle_Desktop-sc-j0e7tu-4 cQhePS NewProductCard__ProductTitle_Desktop-sc-j0e7tu-4 cQhePS"]').text().trim();
//     let price = $(el).find('h5[class="Text__StyledText-sc-oo0kvp-0 hiHdyy"]').text().trim();
//     let discount = $(el).find('span[class="Text__StyledText-sc-oo0kvp-0 gClceh"]').text().replace(/\ (.*)/g,'');
//     let rating = $(el).find('span[class="Rating__StyledPill-sc-5nayi4-0 klyAWP"]').text().trim();
//     rating = (rating == "") ? "NULL" : rating;

//     data.push({
//       Image:img,
//       Name:name,
//       Price:price,
//       Discount:discount,
//       Rating:rating,
//     });
//   });

//   // Last row
//   $('div[class="sc-dkPtRN ProductList__GridCol-sc-8lnc8o-0 FjWWx fUGXjw"]').each(function (idx, el) {
//     let img = $(el).find('noscript').html();
//     if(img === null)
//       img = $(el).find('img').attr('src');
//     else
//       img = $(img).attr('src');

//     let name = $(el).find('p[class="Text__StyledText-sc-oo0kvp-0 bWSOET NewProductCard__ProductTitle_Desktop-sc-j0e7tu-4 cQhePS NewProductCard__ProductTitle_Desktop-sc-j0e7tu-4 cQhePS"]').text().trim();
//     let price = $(el).find('h5[class="Text__StyledText-sc-oo0kvp-0 hiHdyy"]').text().trim();
//     let discount = $(el).find('span[class="Text__StyledText-sc-oo0kvp-0 gClceh"]').text().replace(/\ (.*)/g,'');
//     let rating = $(el).find('span[class="Rating__StyledPill-sc-5nayi4-0 klyAWP"]').text().trim();
//     rating = (rating == "") ? "NULL" : rating;

//     data.push({
//       Image:img,
//       Name:name,
//       Price:price,
//       Discount:discount,
//       Rating:rating,
//     });
//   });