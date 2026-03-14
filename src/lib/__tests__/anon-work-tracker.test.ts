import { test, expect, beforeEach, describe } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

beforeEach(() => {
  sessionStorage.clear();
});

describe("setHasAnonWork", () => {
  test("stores data when messages are present", () => {
    const messages = [{ role: "user", content: "hello" }];
    const fsData = { "/": { type: "directory" } };

    setHasAnonWork(messages, fsData);

    expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
  });

  test("stores serialized messages and fileSystemData", () => {
    const messages = [{ role: "user", content: "hello" }];
    const fsData = { "/App.jsx": "content" };

    setHasAnonWork(messages, fsData);

    const stored = JSON.parse(sessionStorage.getItem("uigen_anon_data")!);
    expect(stored.messages).toEqual(messages);
    expect(stored.fileSystemData).toEqual(fsData);
  });

  test("stores data when fileSystem has more than root entry", () => {
    const messages: any[] = [];
    const fsData = { "/": {}, "/App.jsx": "code" };

    setHasAnonWork(messages, fsData);

    expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
  });

  test("does not store when messages are empty and fileSystem has only root", () => {
    const messages: any[] = [];
    const fsData = { "/": {} };

    setHasAnonWork(messages, fsData);

    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
    expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
  });

  test("does not store when messages are empty and fileSystemData is empty object", () => {
    setHasAnonWork([], {});

    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
  });
});

describe("getHasAnonWork", () => {
  test("returns false when nothing is stored", () => {
    expect(getHasAnonWork()).toBe(false);
  });

  test("returns true after setHasAnonWork stores data", () => {
    setHasAnonWork([{ role: "user", content: "hi" }], {});
    expect(getHasAnonWork()).toBe(true);
  });

  test("returns false when storage key is not 'true'", () => {
    sessionStorage.setItem("uigen_has_anon_work", "false");
    expect(getHasAnonWork()).toBe(false);
  });
});

describe("getAnonWorkData", () => {
  test("returns null when no data stored", () => {
    expect(getAnonWorkData()).toBeNull();
  });

  test("returns parsed data when stored", () => {
    const messages = [{ role: "user", content: "make a button" }];
    const fileSystemData = { "/App.jsx": "export default () => <button />" };
    setHasAnonWork(messages, fileSystemData);

    const result = getAnonWorkData();

    expect(result).toEqual({ messages, fileSystemData });
  });

  test("returns null for malformed JSON in storage", () => {
    sessionStorage.setItem("uigen_anon_data", "{invalid json}");

    expect(getAnonWorkData()).toBeNull();
  });
});

describe("clearAnonWork", () => {
  test("removes both storage keys", () => {
    setHasAnonWork([{ role: "user", content: "hi" }], {});
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");

    clearAnonWork();

    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
    expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
  });

  test("does not throw when storage is already empty", () => {
    expect(() => clearAnonWork()).not.toThrow();
  });
});
