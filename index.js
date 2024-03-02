const { default: mongoose } = require("mongoose");
const puppeteer = require("puppeteer");
const Snap = require("./models/snaps");
const User = require("./models/user");
const cron = require("node-cron");
const connectDb = require("./config/db");
connectDb();

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
      (imgs) => imgs.map((img) => img.src)
    );

    // Extract video URLs
    const videoUrls = await page.$$eval(
      "video.StoryWebPlayer_media__LqV78 source",
      (sources) => sources.map((source) => source.src)
    );

    return { imageUrls, videoUrls };
  }

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

cron.schedule("55 13 * * *", async () => {
  console.log("started cron job....");
  try {
    const users = await User.find({});

    for (const user of users) {
      for (const influencer of user.influencers) {
        await scrapeImagesAndVideos(influencer, user._id);
      }
    }
  } catch (error) {
    console.error("Error fetching users from MongoDB:", error);
  }
});
