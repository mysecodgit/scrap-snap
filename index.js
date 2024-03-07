require("dotenv").config();
const express = require("express");
const app = express();

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
  await page.setDefaultNavigationTimeout(0);
  // Function to extract image and video URLs from the page
  async function extractMediaUrls() {
    // Extract image URLs
    const imageUrls = await page.$$eval(
      "img.StoryWebPlayer_media__LqV78",
      (imgs) => imgs.map((img) => ({ type: "image", src: img.src }))
    );

    // Extract video URLs
    const videoUrls = await page.$$eval(
      "video.StoryWebPlayer_media__LqV78 source",
      (sources) => sources.map((source) => ({ type: "video", src: source.src }))
    );

    return { imageUrls, videoUrls };
  }

  const timeStamp = await page.$(".TimestampCard_textColor__zQsVi");
  const innerText = await page.evaluate((el) => el.innerText, timeStamp);

  if (!hoursAgo.includes(innerText))
    return console.log("the ", influencer, " did not post story today");

  // Scrape the initial page
  const initialMedia = await extractMediaUrls();
  let allMedia = [...initialMedia.imageUrls, ...initialMedia.videoUrls];

  // Click the button to continue to the next items
  let hasNext = true;
  let i = 1;
  while (hasNext) {
    const button = await page.$('div[aria-label="Navigate right"]');
    if (button) {
      await button.click();
      console.log(i + "button is clicked");
      const newMedia = await extractMediaUrls();
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
      urls: allMedia,
    });
    console.log("Succeffuly scraped");
  } catch (e) {
    console.log("Error => ", e);
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

app.get("/fetch", async (req, res) => {
  try {
    const result = await Snap.aggregate([
      {
        $unwind: "$urls",
      },
      {
        $sort: {
          snapDate: -1,
        },
      },
      {
        $group: {
          _id: {
            influencerUsername: "$influencerUsername",
            snapDate: "$snapDate",
          },
          urls: { $push: "$urls" },
        },
      },
      {
        $group: {
          _id: "$_id.influencerUsername",
          data: {
            $push: {
              date: "$_id.snapDate",
              urls: "$urls",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          influencerName: "$_id",
          data: 1,
        },
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

// scrapeImagesAndVideos("ccc.7c", "65e374ed6baf5965b7ec3054");

cron.schedule("00 13 * * *", async () => {
  console.log("started cron job....");
  try {
    const users = await User.find({});
    const scrapeTasks = [];

    for (const user of users) {
      for (const influencer of user.influencers) {
        scrapeTasks.push(scrapeImagesAndVideos(influencer, user._id));
      }
    }

    await Promise.all(scrapeTasks);
  } catch (error) {
    console.error("Error fetching users from MongoDB:", error);
  }
});
