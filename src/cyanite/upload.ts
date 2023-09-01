import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import fs from "fs";
import axios from "axios";
import {
  createLibraryTrackQuery,
  requestFileUploadQuery,
} from "../queries/index.js";

const CYANITE_API_URL = "https://api.cyanite.ai/graphql";
// const uploadUrl =
//   "https://s3.eu-central-1.amazonaws.com/cyanite-file-storage/1/a64ea798-3490-4b42-9917-2c63307d747d?Content-Type=audio%2Fmpeg&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAJEAGRZG3TDV5AMHQ%2F20210204%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20210204T132927Z&X-Amz-Expires=900&X-Amz-Signature=8d8e8b8029dc2710e1ca27be1ef9094801e4e8bd7c0c313ac40da30a56330558&X-Amz-SignedHeaders=host";
// const fileName = "frog.mp3";

export const requestFileUpload = async (): Promise<null | {
  id: string;
  uploadUrl: string;
}> => {
  const graphqlQuery: any = {
    query: requestFileUploadQuery,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.CYANITE_ACCESS_TOKEN}`,
  };

  const res = await axios.post(CYANITE_API_URL, graphqlQuery, { headers });
  const fileInfo = res.data?.data?.fileUploadRequest;
  if (fileInfo) {
    const { id, uploadUrl } = fileInfo;
    return { id, uploadUrl };
  }
  return null;
};

export const uploadFileToCyanite = async (
  uploadUrl: string,
  filename: string
) => {
  try {
    console.log({
      uploadUrl,
      filename,
    });
    const res = await axios.put(uploadUrl, fs.readFileSync(filename));
    console.log(res.data);
  } catch (e) {
    console.log("Error in uploading file: ", e.message);
  }
  //   fetch(uploadUrl, {
  //     method: "PUT",
  //     body: fs.createReadStream(fileName),
  //     headers: {
  //       "Content-Type": fs.statSync(fileName).size.toString(),
  //     },
  //   }).then((res) => res.text());
};
export const createLibraryTrack = async (uploadId: string, title: string) => {
  const input = { uploadId, title };
  try {
    console.log({ uploadId });
    const res = await axios.post(
      CYANITE_API_URL,
      {
        query: createLibraryTrackQuery,
        variables: {
          input,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CYANITE_ACCESS_TOKEN}`,
        },
      }
    );
    console.log("res: ", res.data?.data);
    return res.data?.data;
  } catch (e: any) {
    console.log("err: ", e.message);
  }
};
