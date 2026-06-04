const { chromium } = require("playwright");

const baseUrl = process.env.QA_URL || "http://127.0.0.1:8000";
const viewports = [
  { name: "mobile-390", width: 390, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
];

async function inspectPage(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const initialOrder = await page.evaluate(() => {
    const workspace = document.querySelector(".workspace").getBoundingClientRect();
    const sidebar = document.querySelector(".app-sidebar").getBoundingClientRect();

    return {
      workspaceTop: Math.round(workspace.top),
      sidebarTop: Math.round(sidebar.top),
    };
  });
  await page.locator("#replyInput").fill("I'd like a table for two, please.");

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const doc = document.documentElement;
    const textarea = document.querySelector("#replyInput");
    const sendButton = document.querySelector(".send-button");
    const appShell = document.querySelector(".app-shell");
    const coachColumn = document.querySelector(".coach-column");

    const rectFor = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    return {
      viewportWidth: window.innerWidth,
      scrollWidth: Math.max(body.scrollWidth, doc.scrollWidth),
      appShell: rectFor(appShell),
      textarea: rectFor(textarea),
      sendButton: rectFor(sendButton),
      coachColumn: rectFor(coachColumn),
      textareaFontSize: window.getComputedStyle(textarea).fontSize,
    };
  });
  metrics.initialOrder = initialOrder;

  await page.screenshot({
    path: `qa-${viewport.name}.png`,
    fullPage: true,
  });

  const failures = [];
  if (metrics.scrollWidth > metrics.viewportWidth + 1) {
    failures.push(`horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewportWidth}px`);
  }
  if (metrics.textarea.width < 260 && viewport.width >= 390) {
    failures.push(`textarea too narrow: ${metrics.textarea.width}px`);
  }
  if (metrics.sendButton.width < 120) {
    failures.push(`send button too narrow: ${metrics.sendButton.width}px`);
  }
  if (metrics.textareaFontSize !== "16px" && viewport.width <= 480) {
    failures.push(`mobile textarea font-size should be 16px, got ${metrics.textareaFontSize}`);
  }
  if (viewport.width <= 480 && metrics.initialOrder.workspaceTop > metrics.initialOrder.sidebarTop) {
    failures.push(
      `mobile workspace should render before sidebar: workspaceTop=${metrics.initialOrder.workspaceTop}, sidebarTop=${metrics.initialOrder.sidebarTop}`,
    );
  }

  return { viewport: viewport.name, metrics, failures };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const viewport of viewports) {
    results.push(await inspectPage(page, viewport));
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));

  const failures = results.flatMap((result) =>
    result.failures.map((failure) => `${result.viewport}: ${failure}`),
  );
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
