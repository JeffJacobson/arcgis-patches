import type { MD5 } from "bun";

/**
 * A filename and its corresponding hash value, separated by a colon (`:`).
 */
type Sum = `${string}:${ReturnType<typeof MD5.toString>}`;

interface Patch {
  Name: string;
  /**
   * A string containing a comma-separated list of product names.
   */
  Products: string[];
  Platform: string;
  url: URL;
  QFE_ID: string;
  ReleaseDate: Date;
  Critical: boolean | string;
  PatchFiles: URL[];
  SHA256sums: Sum[];
  MD5sums: Sum[];
}

interface Product {
  version: string;
  patches: Patch[];
}

interface Response {
  Product: Product[];
}


/**
 * Parses a date string in the format 'YYYY/MM/DD' and returns a Date object.
 *
 * @param {string} dateAsString - The date string to be parsed.
 * @return {Date} The parsed Date object.
 */
function parseDate(dateAsString: string) {
  const dateRe = /(\d{4})\/(\d{2})\/(\d{2})/;
  const match = dateRe.exec(dateAsString);
  const ymd = match
    ?.slice(1)
    .map((s, i) => (i === 1 ? parseInt(s) - 1 : parseInt(s))) as
    | [number, number, number]
    | undefined;
  if (!ymd) {
    throw new Error(`Unable to parse date: ${dateAsString}`);
  }
  return new Date(...ymd);
}

/**
 * Parses a string value into a boolean or returns the original value if it cannot be parsed.
 * @param value - The string value to parse.
 * @return - The parsed boolean value or the original value.
 */
function parseBoolean<T extends string>(value: T): boolean | T {
  const re = /^(?:(?<true>true)|(?<false>false))$/;
  const match = re.exec(value);
  if (match?.groups) {
    return match.groups["true"] ? true : false;
  }
  return value;
}

/**
 * A reviver function for JSON.parse that converts the value of the "ReleaseDate"
 * property from a string to a Date object.
 *
 * @param key - The key of the current property being processed.
 * @param value - The value of the current property being processed.
 * @return The processed value, which could be the original value or a
 * Date object if the key is "ReleaseDate" and the value is a string.
 */
const reviver: Parameters<typeof JSON.parse>[1] = function (
  key,
  value: unknown
) {
  if (value === "string") {
    if (key === "Products") {
      return value.split(/,\s*/);
    }
    if (key === "ReleaseDate") {
      try {
        return parseDate(value);
      } catch (error) {
        console.error(error);
        return value;
      }
    }
    if (/^https?:\/\//.test(value)) {
      return new URL(value);
    }

    const possibleBoolean = parseBoolean(value);
    if (typeof possibleBoolean === "boolean") {
      return possibleBoolean;
    }
  }
  return value;
};

const url = "https://downloads.esri.com/patch_notification/patches.json";

const response = await fetch(url);
const responseText = await response.text();
const patches = JSON.parse(responseText, reviver) as Response;

const productList = patches.Product;

for (const { version, patches } of productList) {
  console.log(`Version ${version}:`);
  console.log(patches);
  // for (const patch of patches) {
  //   console.log(`  ${patch.Name}`);
  //   patch.PatchFiles = patch.PatchFiles.join("\n") as unknown as URL[];
  // }
  // console.table(patches);
}
