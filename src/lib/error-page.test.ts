import { describe, it, expect } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("returns a valid HTML string with expected content", () => {
    const html = renderErrorPage();

    expect(typeof html).toBe("string");

    // Check basic HTML structure
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="en">');

    // Check title and heading
    expect(html).toContain("<title>This page didn't load</title>");
    expect(html).toContain("<h1>This page didn't load</h1>");

    // Check interactive elements
    expect(html).toContain(
      '<button class="primary" onclick="location.reload()">Try again</button>',
    );
    expect(html).toContain('<a class="secondary" href="/">Go home</a>');
  });
});

describe("createErrorResponse", () => {
  it("returns a Response with status 500 and text/html content-type", async () => {
    // Import dynamically to avoid top-level issues if something fails
    const { createErrorResponse } = await import("./error-page");
    const response = createErrorResponse();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");

    const body = await response.text();
    expect(body).toContain("This page didn't load");
  });
});
