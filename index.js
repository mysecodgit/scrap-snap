require("dotenv").config();
const express = require("express");
const app = express();
const fs = require("fs");
const cors = require("cors");

app.use(cors());

const { default: mongoose } = require("mongoose");
const puppeteer = require("puppeteer");
const Snap = require("./models/snaps");
const User = require("./models/user");
const cron = require("node-cron");
const connectDb = require("./config/db");
connectDb();

const hoursAgo = [
  "1m ago",
  "2m ago",
  "3m ago",
  "4m ago",
  "5m ago",
  "6m ago",
  "7m ago",
  "8m ago",
  "9m ago",
  "10m ago",
  "11m ago",
  "12m ago",
  "13m ago",
  "14m ago",
  "15m ago",
  "16m ago",
  "17m ago",
  "18m ago",
  "19m ago",
  "20m ago",
  "21m ago",
  "22m ago",
  "23m ago",
  "24m ago",
  "25m ago",
  "26m ago",
  "27m ago",
  "28m ago",
  "29m ago",
  "30m ago",
  "31m ago",
  "32m ago",
  "33m ago",
  "34m ago",
  "35m ago",
  "36m ago",
  "37m ago",
  "38m ago",
  "39m ago",
  "40m ago",
  "41m ago",
  "42m ago",
  "43m ago",
  "44m ago",
  "45m ago",
  "46m ago",
  "47m ago",
  "48m ago",
  "49m ago",
  "50m ago",
  "51m ago",
  "52m ago",
  "53m ago",
  "54m ago",
  "55m ago",
  "56m ago",
  "57m ago",
  "58m ago",
  "59m ago",
  "1h ago",
  "2h ago",
  "3h ago",
  "4h ago",
  "5h ago",
  "6h ago",
  "7h ago",
  "8h ago",
  "9h ago",
  "10h ago",
  "11h ago",
  "12h ago",
  "13h ago",
  "14h ago",
  "15h ago",
  "16h ago",
  "17h ago",
  "18h ago",
  "19h ago",
  "20h ago",
  "21h ago",
  "22h ago",
  "23h ago",
];

async function scrapeImagesAndVideos(influencer, userId) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.snapchat.com/add/${influencer}`);
  // await page.goto(
  //   `https://www.snapchat.com/add/abood/zbtaYpS-QqqC2296166IdQAAgdW1yY2NzYm5xAY9URJsXAY9URJmLAAAAAA`
  // );
  await page.setDefaultNavigationTimeout(0);

  const buttonClick = await page.$(
    ".RenderProfilePicture_profilePictureWrapper__cwpB3"
  );

  console.log("founded .0.0.- ", buttonClick);

  await buttonClick.click();

  async function extractMediaUrls() {
    // Extract image URLs
    const imageUrls = await page.$$eval(
      "img.StoryWebPlayer_media__yUoMN",
      (imgs) => imgs.map((img) => ({ type: "image", src: img.src }))
    );

    // Extract video URLs
    const videoUrls = await page.$$eval(
      "video.StoryWebPlayer_videoPlayer__JRST8 source",
      (sources) => sources.map((source) => ({ type: "video", src: source.src }))
    );

    return { imageUrls, videoUrls };
  }

  const timeStamp = await page.$(".TimestampCard_textColor__3w3uC");
  const innerText = await page.evaluate((el) => el.innerText, timeStamp);

  console.log("TIME :: ",innerText)
  // if (!hoursAgo.includes(innerText))
  // return console.warn("the ", influencer, " did not post story today");

  // Scrape the initial page
  // const initialMedia = await extractMediaUrls();
  // let allMedia = [...initialMedia.imageUrls, ...initialMedia.videoUrls];
  let allMedia = [];

  // Click the button to continue to the next items
  let hasNext = true;
  let i = 1;
  while (hasNext) {
    const button = await page.$('div[aria-label="Navigate right"]');
    
    const timeStamp = await page.$(".TimestampCard_textColor__3w3uC");
     const innerText = await page.evaluate((el) => el.innerText, timeStamp);

    if (button) {
      if (!hoursAgo.includes(innerText)) {
        await button.click();
        console.log(i + ` Button clicked - Condition met [${innerText}]. Skipping this iteration.`);
        i++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Optional delay
        continue
      } 

      await button.click();
      const newMedia = await extractMediaUrls();
      console.log(
        i +
          " button is clicked img : " +
          newMedia.imageUrls.length +
          " vids : " +
          newMedia.videoUrls.length
      );
      allMedia = [...allMedia, ...newMedia.imageUrls, ...newMedia.videoUrls];
      i++;
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Add a 2-second delay
    } else {
      hasNext = false;
    }
  }

  try {
    await Snap.create({
      influencerUsername: influencer,
      user: new mongoose.Types.ObjectId(userId),
      urls: allMedia
    });
    console.warn(influencer + " stories was succeffuly scraped");
  } catch (e) {
    console.error("Error => ", e);
  } finally {
    await browser.close();
  }
}

app.listen(5002, () => console.log("app listening on port 5002"));

app.get("/add-user", async (req, res) => {
  const user = await User.create({
    userName: "hudeifa",
    influencers: ["me_05514"],
  });
  res.send(user);
});

// app.get("/fetch", async (req, res) => {
//   try {
//     const result = await Snap.aggregate([
//       {
//         $unwind: "$urls",
//       },
//       {
//         $sort: {
//           snapDate: -1,
//         },
//       },
//       {
//         $group: {
//           _id: {
//             influencerUsername: "$influencerUsername",
//             snapDate: "$snapDate",
//           },
//           urls: { $push: "$urls" },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.influencerUsername",
//           data: {
//             $push: {
//               date: "$_id.snapDate",
//               urls: "$urls",
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           influencerName: "$_id",
//           data: 1,
//         },
//       },
//     ]);
//     res.send(result);
//   } catch (e) {
//     console.log(e);
//   }
// });

app.get("/fetch", async (req, res) => {
  try {
    const result = await Snap.aggregate([
      {
        $match: {
          snapDate: {
            $gte: new Date("2025-03-01T00:00:00Z"), // Start date (inclusive)
            $lte: new Date("2025-06-30T23:59:59Z"), // End date (inclusive)
          },
        },
      },
      {
        $sort: { influencerUsername: 1, snapDate: -1 }, // Sort by influencer name (ascending) and snapDate (descending)
      },
      {
        $group: {
          _id: "$influencerUsername",
          data: {
            $push: {
              date: "$snapDate",
              urls: "$urls",
              isImportant: "$isImportant",
              description: "$description",
            },
          },
        },
      },
      {
        $project: {
          influencerName: "$_id",
          data: 1,
          _id: 0,
        },
      },
      {
        $sort: { influencerName: -1 }, // Sort the final result by influencer name (ascending)
      },
    ]);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

app.get("/scrape", async (req, res) => {
  try {
    const users = await User.find({});
    const scrapeTasks = [];

    for (const user of users) {
      for (const influencer of user.influencers) {
        scrapeTasks.push(scrapeImagesAndVideos(influencer, user._id));
      }
    }

    await Promise.all(scrapeTasks);
    return res.send("finished");
  } catch (error) {
    console.error("Error fetching users from MongoDB:", error);
  }
});

app.get("/get-urls/:influencer/:date", async (req, res) => {
  const result = await Snap.aggregate([
    {
      $match: {
        influencerUsername: req.params.influencer,
        snapDate: {
          $gte: new Date(`${req.params.date}T00:00:00.000+00:00`),
          $lte: new Date(`${req.params.date}T23:59:59.999+00:00`),
        },
      },
    },
    {
      $sort: {
        "urls.index": 1,
      },
    },
    {
      $project: {
        videoUrls: {
          $map: {
            input: {
              $filter: {
                input: "$urls",
                cond: { $eq: ["$$this.type", "video"] },
              },
            },
            as: "url",
            in: "$$url.src",
          },
        },
      },
    },
  ]);

  // const videoUrls = result[0].videoUrls;

  // fs.writeFile("myurls.txt", videoUrls.join("\n"), (err) => {
  //   if (err) {
  //     console.error("Error writing file:", err);
  //   } else {
  //     console.log(`Video URLs have been written to`);
  //   }
  // });

  res.send(result[0]?.videoUrls || []);
});

app.get("/get-all-urls/:influencer/:date", async (req, res) => {
  const result = await Snap.aggregate([
    {
      $match: {
        influencerUsername: req.params.influencer,
        snapDate: {
          $gte: new Date(`${req.params.date}T00:00:00.000+00:00`),
          $lte: new Date(`${req.params.date}T23:59:59.999+00:00`),
        },
      },
    },
    // {
    //   $project: {
    //     videoUrls: {
    //       $map: {
    //         input: {
    //           $filter: {
    //             input: "$urls",
    //             cond: { $eq: ["$$this.type", "video"] },
    //           },
    //         },
    //         as: "url",
    //         in: "$$url.src",
    //       },
    //     },
    //   },
    // },
  ]);

  // const videoUrls = result[0].videoUrls;

  // fs.writeFile("myurls.txt", videoUrls.join("\n"), (err) => {
  //   if (err) {
  //     console.error("Error writing file:", err);
  //   } else {
  //     console.log(`Video URLs have been written to`);
  //   }
  // });

  res.send(result[0]?.urls || []);
});

// scrapeImagesAndVideos("ccc.7c", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("fares_alqubbi", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("abood", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("al7ejab", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("m_3z3z", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("baba-slam", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("n24n1", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("zezo_ziba1d1", "65e374ed6baf5965b7ec3054");
// scrapeImagesAndVideos("aaja.2", "65e374ed6baf5965b7ec3054");

// cron.schedule("06 16 * * *", async () => {
//   console.log("started cron job....");
//   try {
//     const users = await User.find({});
//     const scrapeTasks = [];

//     for (const user of users) {
//       for (const influencer of user.influencers) {
//         scrapeTasks.push(scrapeImagesAndVideos(influencer, user._id));
//       }
//     }

//     await Promise.all(scrapeTasks);
//   } catch (error) {
//     console.error("Error fetching users from MongoDB:", error);
//   }
// });

async function optional(mashaahiir) {
  console.log("started others....");
  try {
    const scrapeTasks = [];

    // scrapeTasks.push(
    //   scrapeImagesAndVideos("abood", "65e374ed6baf5965b7ec3054")
    // );
    // scrapeTasks.push(
    //   scrapeImagesAndVideos("wwee41", "65e374ed6baf5965b7ec3054")
    // );
    // scrapeTasks.push(
    //   scrapeImagesAndVideos("nktv39", "65e374ed6baf5965b7ec3054")
    // );
    // scrapeTasks.push(scrapeImagesAndVideos("abood", "65e374ed6baf5965b7ec3054"))
    // scrapeTasks.push(scrapeImagesAndVideos("wwee41", "65e374ed6baf5965b7ec3054"))
    // scrapeTasks.push(
    //   scrapeImagesAndVideos("me_05514", "65e374ed6baf5965b7ec3054")
    // );

    mashaahiir.forEach((mashoor) => {
      scrapeTasks.push(
        scrapeImagesAndVideos(mashoor, "65e374ed6baf5965b7ec3054")
      );
    });

    // scrapeTasks.push(
    //   scrapeImagesAndVideos("m_3z3z", "65e374ed6baf5965b7ec3054")
    // );
    // scrapeTasks.push(
    //   scrapeImagesAndVideos("n24n1", "65e374ed6baf5965b7ec3054")
    // );
    // scrapeTasks.push(
    //   scrapeImagesAndVideos("ccc.7c", "65e374ed6baf5965b7ec3054")
    // );

    await Promise.all(scrapeTasks);
  } catch (error) {
    console.error("Error :", error);
  }
}

// optional(["m_3z3z", "n24n1", "wwee41"]);
// optional(["m_3z3z", "baba-slam"]);
// optional(["m_3z3z"]);
// optional(["abood"]);
// optional(["fares_alqubbi"]);
// optional(["fw6_z7"]);
// optional(["m_3z3z","mvq.11","aomar1"]);
// optional(["sultan_nq"]);
// optional(["i3bood_sh"]);
// optional(["imej2"]);

// optional(["x3booshz"]);
// optional(["zo666h"]);

// optional(["n24n1"]);
// optional(["fares_alqubbi","baba-slam"]);
// optional(["fares_alqubbi", "m_3z3z"]);
// optional(["baba-slam", "m_3z3z"]);
// optional(["baba-slam"]);
// optional(["rko-1x"]);
// optional(["m_3z3z","baba-slam","fares_alqubbi"]);
// optional(["m_3z3z","me_05514"]);
// optional(["m_3z3z", "baba-slam"]);
// optional(["m_3z3z", "baba-slam", "abood"]);
// optional(["al7ejab","wwee41"]);
// optional(["m_3z3z","abood"]);
// optional(["al7ejab","abood"]);
// optional(["m_3z3z", "ccc.7c"]);
// optional(["m_3z3z", "tyzaryki"]);
// optional(["tyzaryki"]);
// optional(["wwee41"]); 
// optional(["me_05514"]); 
// optional(["aomar1"]);
// optional(["m_3z3z","baba-slam", "tyzaryki"]);
// optional(["m_3z3z", "ccc.7c","abood"]);
// optional(["m_3z3z", "baba-slam", "wwee41"]);
// optional(["m_3z3z", "aaja.2", "n24n1"]);
// optional([ "ccc.7c"]);
// optional(["me_05514"]);
// optional(["aaja.2", "ie.hadi"]);
// optional(["ie.hadi"]);
// optional(["aaja.2"]);
// optional(["m_3z3z","wwee41"]);
// optional(["lv11j", "m_3z3z"]);
// optional(["aboody_8x"]);
// optional(["f_asoo"]);
// optional(["na7vxx"]);
// optional(["a18ne"]);
// optional(["sometimesfaisal"]);
// optional(["cviioul"]);
// optional(["yoof.0"]);
// optional(["brandonrowland"]);
// optional(["fsmand1"]);
// optional(["m6in0"]);

// cron.schedule("30 10 * * *", async () => {
//   console.log("started cron job....");
//   optional(["m_3z3z", "wwee41", "me_05514"]);
// });
