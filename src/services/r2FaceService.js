import { S3Client, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

const ACCOUNT_ID = process.env.REACT_APP_R2_ACCOUNT_ID || "55f7283b0633f2f90ac189c982dbfa61";
const ACCESS_KEY_ID = process.env.REACT_APP_R2_ACCESS_KEY_ID || "3a79f729f5930071a296cd15dd406c32";
const SECRET_ACCESS_KEY = process.env.REACT_APP_R2_SECRET_ACCESS_KEY || "4079076a873d2643475e0ca5657493003e4a3e6ec543bfc7d80ba0c203fc138d";
const BUCKET_NAME = process.env.REACT_APP_R2_BUCKET || "audition";
const ENDPOINT = process.env.REACT_APP_R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_URL = (process.env.REACT_APP_R2_PUBLIC_URL || "https://pub-13bbf5f4111744d4ac0cf81ea6968ec1.r2.dev").replace(/\/+$/, "");

export const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/**
 * Tìm kiếm danh sách mặt qua API server aumix3d (/api/vtc-store)
 * Hỗ trợ tìm kiếm cả Nam, Nữ hoặc Tất cả
 * @param {string} query Tên hoặc từ khóa tìm kiếm
 * @param {'all'|'f'|'m'} gender Giới tính cần tìm ('all' = cả nam & nữ)
 */
export async function searchFacesByApi(query, gender = "all") {
  if (!query || !query.trim()) return [];

  const fetchForGender = async (g) => {
    const params = {
      gender: g,
      part: "f",
      search: query.trim(),
      limit: 20,
      page: 1,
      shopType: "normal",
    };

    let items = [];
    try {
      const res = await axios.get("/api/vtc-store", { params, timeout: 10000 });
      items = res.data?.items || [];
    } catch {
      try {
        const res = await axios.get("https://aumix3d.com/api/vtc-store", { params, timeout: 10000 });
        items = res.data?.items || [];
      } catch {
        items = [];
      }
    }

    return items
      .filter((it) => it.part === "f" || (it.fileName && (it.fileName.startsWith("mf_") || it.fileName.startsWith("ff_"))))
      .map((it) => ({
        ...it,
        gender: g || it.gender || (it.fileName.startsWith("ff") ? "f" : "m"),
      }));
  };

  if (gender === "all") {
    // Gọi song song cả Nữ và Nam để tìm kiếm trọn vẹn
    const [femaleRes, maleRes] = await Promise.allSettled([
      fetchForGender("f"),
      fetchForGender("m"),
    ]);

    const fList = femaleRes.status === "fulfilled" ? femaleRes.value : [];
    const mList = maleRes.status === "fulfilled" ? maleRes.value : [];
    return [...fList, ...mList];
  }

  return await fetchForGender(gender);
}

/**
 * Kiểm tra xem các mặt của code này đã có trên Cloudflare R2 chưa
 * @param {string} code Ví dụ: mf_v0411
 * @returns {Promise<{ found: boolean, items: Array<{ key: string, url: string, num: string }>, isSingle: boolean }>}
 */
export async function checkFacesInR2(code) {
  const cleanCode = code.trim().toLowerCase();
  try {
    // 1. Kiểm tra tiền tố textures/{code}_
    const prefix = `textures/${cleanCode}_`;
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      })
    );

    const contents = res.Contents || [];
    const validPngs = contents.filter((obj) => obj.Key && obj.Key.endsWith(".png"));

    if (validPngs.length > 0) {
      validPngs.sort((a, b) => a.Key.localeCompare(b.Key));
      const items = validPngs.map((obj) => {
        const match = obj.Key.match(/_(\d{3})\.png$/i);
        const num = match ? match[1] : "001";
        return {
          key: obj.Key,
          num: num,
          url: `${PUBLIC_URL}/${obj.Key}`,
          size: obj.Size,
          lastModified: obj.LastModified,
        };
      });
      return { found: true, items, isSingle: items.length === 1 };
    }

    // 2. Kiểm tra nếu là file đơn lẻ textures/{code}.png
    try {
      const singleKey = `textures/${cleanCode}.png`;
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: singleKey }));
      return {
        found: true,
        items: [
          {
            key: singleKey,
            num: "001",
            url: `${PUBLIC_URL}/${singleKey}`,
          },
        ],
        isSingle: true,
      };
    } catch {
      // chưa có file đơn
    }
  } catch (err) {
    console.warn("Lỗi kiểm tra R2:", err);
  }

  return { found: false, items: [], isSingle: false };
}

/**
 * Đọc meta từ aumix3d để lấy số lượng frame (frames - 1 = số mặt)
 * Nếu không có metadata -> Trả về isSingle = true ("Nó chỉ có 1 mặt")
 * @param {string} code Ví dụ: mf_v0411
 * @returns {Promise<{ faceCount: number, isSingle: boolean }>}
 */
export async function fetchFaceFrames(code) {
  const cleanCode = code.trim().toLowerCase();
  const urls = [
    `https://cdn.aumix3d.com/previews/${cleanCode}_skin2_meta.json`,
    `https://cdn.aumix3d.com/previews/${cleanCode}_skin1_meta.json`,
    `https://cdn.aumix3d.com/previews/${cleanCode}_meta.json`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.frames === "number" && data.frames > 1) {
          return { faceCount: data.frames - 1, isSingle: false };
        }
      }
    } catch {
      // bỏ qua, thử url tiếp theo
    }
  }

  // Không tìm thấy metadata -> Mặt tĩnh, chỉ có 1 mặt
  return { faceCount: 1, isSingle: true };
}

/**
 * Tải các ảnh mặt từ cdn.aumix3d.com và tự động upload vào Cloudflare R2
 * Hỗ trợ cả mặt nhiều frame và mặt đơn lẻ (1 mặt)
 * @param {string} code Mã mặt (vd: mf_v0411)
 * @param {function} onProgress Callback cập nhật tiến trình
 * @returns {Promise<{ items: Array<{ key: string, url: string, num: string }>, isSingle: boolean }>}
 */
export async function syncFacesFromCdnToR2(code, onProgress) {
  const cleanCode = code.trim().toLowerCase();

  if (onProgress) onProgress({ status: "meta", message: "Đang đọc metadata từ CDN aumix3d..." });
  const { faceCount, isSingle } = await fetchFaceFrames(cleanCode);

  const results = [];

  if (isSingle) {
    if (onProgress) {
      onProgress({
        status: "downloading",
        total: 1,
        current: 0,
        message: "Không tìm thấy metadata animation. Xác định: Nó chỉ có 1 mặt duy nhất. Đang tải...",
      });
    }

    // Thử tải textures/{code}_001.png hoặc textures/{code}.png
    const candidateUrls = [
      `https://cdn.aumix3d.com/textures/${cleanCode}_001.png`,
      `https://cdn.aumix3d.com/textures/${cleanCode}.png`,
    ];

    let downloadedBlob = null;
    let chosenKey = `textures/${cleanCode}_001.png`;

    for (const testUrl of candidateUrls) {
      try {
        const res = await fetch(testUrl);
        if (res.ok) {
          downloadedBlob = await res.blob();
          if (testUrl.endsWith(`${cleanCode}.png`)) {
            chosenKey = `textures/${cleanCode}.png`;
          }
          break;
        }
      } catch {
        // thử tiếp
      }
    }

    if (!downloadedBlob) {
      throw new Error(`Không tìm thấy texture trên CDN cho mã "${cleanCode}".`);
    }

    const uint8 = new Uint8Array(await downloadedBlob.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: chosenKey,
        Body: uint8,
        ContentType: "image/png",
      })
    );

    const item = {
      key: chosenKey,
      num: "001",
      url: `${PUBLIC_URL}/${chosenKey}`,
      size: downloadedBlob.size,
    };
    results.push(item);

    if (onProgress) {
      onProgress({
        status: "uploading",
        total: 1,
        current: 1,
        item,
        message: "Đã upload 1 mặt lên Cloudflare R2!",
      });
    }

    return { items: results, isSingle: true };
  }

  // Trường hợp có metadata nhiều frame (ví dụ: frames 11 -> 10 mặt: 001 đến 010)
  if (onProgress) {
    onProgress({
      status: "downloading",
      total: faceCount,
      current: 0,
      message: `Tìm thấy ${faceCount} frame mặt. Bắt đầu tải và upload lên R2...`,
    });
  }

  for (let i = 1; i <= faceCount; i++) {
    const pad = String(i).padStart(3, "0");
    const filename = `${cleanCode}_${pad}.png`;
    const cdnUrl = `https://cdn.aumix3d.com/textures/${filename}`;
    const r2Key = `textures/${filename}`;

    try {
      const res = await fetch(cdnUrl);
      if (!res.ok) continue;

      const blob = await res.blob();
      const uint8 = new Uint8Array(await blob.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: r2Key,
          Body: uint8,
          ContentType: "image/png",
        })
      );

      const item = {
        key: r2Key,
        num: pad,
        url: `${PUBLIC_URL}/${r2Key}`,
        size: blob.size,
      };

      results.push(item);

      if (onProgress) {
        onProgress({
          status: "uploading",
          total: faceCount,
          current: i,
          item,
          message: `Đã upload ${i}/${faceCount}: ${filename} lên R2`,
        });
      }
    } catch (err) {
      console.error(`Lỗi tải/upload ${filename}:`, err);
    }
  }

  if (results.length === 0) {
    throw new Error(`Không tải được ảnh nào cho mã "${cleanCode}".`);
  }

  return { items: results, isSingle: false };
}

export { PUBLIC_URL, BUCKET_NAME };
