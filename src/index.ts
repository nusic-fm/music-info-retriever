import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import multer from "multer";
import {
  createLibraryTrack,
  requestFileUpload,
  uploadFileToCyanite,
} from "./cyanite/upload.js";
import axios from "axios";
import FormData from "form-data";
// import ffmpeg from "fluent-ffmpeg";
import { getAudioDurationInSeconds } from "get-audio-duration";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "audio/wav", limit: "10mb" })); // Parse audio blobs
const upload = multer({ dest: "uploads/" }); // Set the destination folder for uploaded files

const port = Number(process.env.PORT) || 8000;

app.get("/", async (req, res) => {
  res.send("saulgoodman....");
});

// Chain: eth, optimism
app.post("/cyanite-upload", upload.single("audio"), async (req, res) => {
  // Get the audio file from the request.
  const uploadedFile = req.file;

  // Save the audio file to a file on the server.
  const tempPath = uploadedFile.path;
  const targetPath = "audio.mp3"; // Set the target path to save the file
  await new Promise((res, rej) => {
    fs.rename(tempPath, targetPath, (err) => {
      if (err) {
        console.error("Error moving the file:", err);
        rej("Error in local storage");
      } else {
        res("");
      }
    });
  });
  const fileInfo = await requestFileUpload();
  if (fileInfo) {
    await uploadFileToCyanite(fileInfo.uploadUrl, tempPath);
    const data = await createLibraryTrack(fileInfo.id, "Alex");
    // libraryTrackCreate: {
    //   __typename: 'LibraryTrackCreateSuccess',
    //   createdLibraryTrack: { id: '15119453' }
    // }
    res.json({ id: data.createdLibraryTrack.id });
  } else {
    res.json({});
  }
});

app.post("/sections", upload.single("audio"), async (req, res) => {
  // Get the audio file from the request.
  const uploadedFile = req.file;
  const tempPath = uploadedFile.path;

  if (!uploadedFile) {
    res.status(500).send("File is missing in the request");
    return;
  }
  const bpmFromArtist = req.body.bpm; // Optional
  const form = new FormData();
  form.append("file", fs.createReadStream(tempPath) as any);

  try {
    // Fetch Energy changes from python service
    const annotationePromise = axios.post(
      `${process.env.PY_SERVER_ENDPOINT}/energy`,
      form,
      {
        headers: {
          ...(form as any).getHeaders(),
        },
      }
    );
    // Fetch Duration of the music
    const durationPromise: Promise<number> =
      getAudioDurationInSeconds(tempPath);
    // new Promise((res, rej) => {
    //   ffmpeg()
    //     .input(tempPath)
    //     .ffprobe(async (err, metadata) => {
    //       if (err) {
    //         console.error(err);
    //         rej();
    //       }

    //       const durationInSeconds = metadata.format.duration;
    //       console.log("Audio duration:", durationInSeconds, "seconds");
    //       res(durationInSeconds);
    //     });
    // });

    const [annotationObj, duration] = await Promise.all([
      annotationePromise,
      durationPromise,
    ]);

    const results = annotationObj.data.results;
    const key = annotationObj.data.key;
    const bpm = bpmFromArtist ?? annotationObj.data.bpm;

    if (!bpm) {
      res.status(500).send("Error analysing the BPM ");
      return;
    }
    // const threashold = annotationObj.data.threashold;
    const beatsPerSecond = Math.round((Number(bpm) / 60) * 100) / 100;
    const totalBeats = Math.round(beatsPerSecond * duration * 100) / 100;
    const noOfBars = Math.round(totalBeats / 4);
    console.log({ noOfBars });
    const _eachBarDuration = duration / noOfBars;
    const barDuration = Math.round(_eachBarDuration * 100) / 100;
    //   console.log({barDuration})
    const endBarInSeconds = new Array(noOfBars)
      .fill(0)
      .map((_n, i) => (i + 1) * barDuration);

    const idealForFourthMeter = new Array(noOfBars)
      .fill(0)
      .map((_n, i) => {
        if (i % 4 === 0) return i;
        else 0;
      })
      .filter((n) => !!n)
      .map((n) => n * barDuration);
    const sectionsIdx = [];
    const extrasForTesting = [];

    results.map((s) => {
      const beatStart = s[0];
      // const beatEnd = s[s.length - 1];
      const elem = findClosestElement(endBarInSeconds, beatStart);
      const idx = endBarInSeconds.indexOf(elem) + 1;
      extrasForTesting.push({
        energyStart: Math.round(beatStart * 100) / 100,
        barAt: `${elem}s`,
        barNo: idx,
      });
      if (
        idealForFourthMeter.includes(elem) &&
        sectionsIdx.includes(idx) === false
      ) {
        sectionsIdx.push(idx);
      }
    });

    res.json({
      sections: sectionsIdx,
      bpm,
      duration,
      key,
      totalNumberOfBars: noOfBars,
      extrasForTesting,
      energyChanges: results,
    });
    return;
  } catch (e) {
    console.log("err: ", e.message);
  }
  res.send("Something went wrong");
});

app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});

function findClosestElement(array, value) {
  let closestElement = array[0];
  let closestDistance = Math.abs(array[0] - value);

  for (let element of array) {
    let distance = Math.abs(element - value);
    if (distance < closestDistance) {
      closestElement = element;
      closestDistance = distance;
    }
  }

  return closestElement;
}
