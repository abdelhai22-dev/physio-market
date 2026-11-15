const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function boot(file) {
  const source = fs.readFileSync(file, "utf8");
  const listeners = {};
  const storage = {};
  const alerts = [];
  const downloads = [];
  let fetchCalls = 0;

  const app = {
    innerHTML: "",
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    querySelector() {
      return { focus() {}, setSelectionRange() {} };
    },
  };

  const document = {
    querySelector(selector) {
      assert.equal(selector, "#sector-app");
      return app;
    },
    createElement(tag) {
      assert.equal(tag, "a");
      return {
        href: "",
        download: "",
        click() {
          downloads.push({ href: this.href, name: this.download });
        },
      };
    },
  };

  class MockFormData {
    constructor(form) {
      this.form = form;
    }
    entries() {
      return Object.entries(this.form.values || {});
    }
  }

  class MockBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options?.type || "";
    }
  }

  class MockURL extends URL {
    static createObjectURL() {
      return "blob:market-smoke-test";
    }
    static revokeObjectURL() {}
  }

  const sandbox = {
    document,
    localStorage: {
      getItem(key) {
        return storage[key] ?? null;
      },
      setItem(key, value) {
        storage[key] = value;
      },
    },
    alert(message) {
      alerts.push(String(message));
    },
    confirm() {
      return true;
    },
    FormData: MockFormData,
    Blob: MockBlob,
    URL: MockURL,
    setTimeout() {
      return 0;
    },
    fetch: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        json: async () => ({
          ok: true,
          creditsUsed: 1,
          results: [{
            title: "Smoke test result",
            url: "https://example.com/item",
            description: "Synthetic test result",
            productLabel: "Test wrench",
            observedAt: "2026-11-15",
          }],
        }),
      };
    },
  };

  vm.runInNewContext(source, sandbox, { filename: file });

  return {
    app,
    storage,
    alerts,
    downloads,
    get fetchCalls() {
      return fetchCalls;
    },
    has(text) {
      return app.innerHTML.includes(text);
    },
    async click(dataset) {
      const target = {
        dataset,
        closest(selector) {
          return selector === "button" ? this : null;
        },
      };
      for (const handler of listeners.click || []) {
        await handler({ target });
      }
      await Promise.resolve();
      await Promise.resolve();
    },
    async submit(kind, values) {
      const form = {
        dataset: { kind },
        values,
        closest(selector) {
          return selector === "form[data-kind]" ? this : null;
        },
      };
      for (const handler of listeners.submit || []) {
        await handler({ target: form, preventDefault() {} });
      }
    },
    data(key) {
      return JSON.parse(storage[key] || "{}");
    },
  };
}

async function testTools() {
  const app = boot("tools-market.js");
  const key = "as-tools-market-v1";

  assert.ok(app.has("لوحة مؤشرات TOOLS MARKET"), "TOOLS dashboard renders");

  await app.click({ tab: "products" });
  await app.click({ add: "product" });
  assert.ok(app.has('data-kind="product"'), "product form opens");

  await app.submit("product", {
    name: "Test wrench",
    model: "W-01",
    category: "wrench",
    brand: "Test",
    country: "Egypt",
    specs: "Synthetic test record",
  });
  const product = app.data(key).products[0];
  assert.equal(product.name, "Test wrench", "product is stored locally");

  await app.click({ edit: "products", id: product.code });
  assert.ok(app.has('value="Test wrench"'), "edit form is prefilled");

  await app.click({ tab: "suppliers" });
  await app.click({ add: "supplier" });
  await app.submit("supplier", {
    name: "Test supplier",
    country: "Egypt",
    city: "Cairo",
    website: "https://example.com",
    type: "distributor",
    notes: "Synthetic test record",
  });
  assert.equal(app.data(key).suppliers.length, 1, "supplier can be added");

  await app.click({ tab: "prices" });
  await app.click({ add: "price" });
  assert.ok(app.has('data-kind="price"'), "price form opens");
  await app.submit("price", {
    productCode: product.code,
    amount: "100",
    currency: "EGP",
    priceType: "published_retail",
    observedAt: "2026-11-15",
    sourceUrl: "https://example.com/price",
  });
  await app.click({ tab: "analysis" });
  assert.ok(app.has("EGP"), "price analysis displays its currency");

  await app.click({ tab: "radar" });
  await app.click({ scan: "" });
  assert.equal(app.fetchCalls, 1, "scan button calls the Worker endpoint");
  assert.equal(app.data(key).radar.length, 1, "scan result is persisted");

  await app.click({ save: "0" });
  assert.equal(
    app.data(key).sources[0].status,
    "needs_review",
    "scan result is saved only as an unverified source"
  );
}

async function testVape() {
  const app = boot("vape-market.js");
  const key = "as-vape-info-v1";

  assert.ok(app.has("لوحة متابعة VAPE"), "VAPE dashboard renders");

  await app.click({ tab: "taxonomy" });
  await app.click({ add: "taxonomy" });
  assert.ok(app.has('data-kind="taxonomy"'), "taxonomy form opens");
  await app.submit("taxonomy", {
    name: "Device class",
    group: "devices",
    description: "Neutral classification",
    sourceCode: "SRC-1",
  });
  const item = app.data(key).taxonomy[0];
  assert.equal(item.name, "Device class", "taxonomy record is stored");

  await app.click({ edit: "taxonomy", id: item.code });
  assert.ok(app.has('value="Device class"'), "taxonomy edit form is prefilled");

  await app.click({ tab: "records" });
  await app.click({ add: "record" });
  await app.submit("record", {
    title: "Public technical note",
    type: "technical",
    category: "devices",
    authority: "Publisher",
    date: "2026-11-15",
    url: "https://example.com/note",
    notes: "Synthetic test record",
  });
  assert.equal(app.data(key).records.length, 1, "information record can be added");

  await app.click({ tab: "regulations" });
  await app.click({ add: "regulation" });
  await app.submit("regulation", {
    title: "Public notice",
    authority: "Authority",
    jurisdiction: "Egypt",
    type: "notice",
    publishedAt: "2026-11-15",
    status: "needs_review",
  });
  assert.equal(app.data(key).regulations.length, 1, "regulatory record can be added");

  await app.click({ tab: "dashboard" });
  await app.click({ json: "" });
  assert.equal(app.downloads.length, 1, "JSON backup action downloads a file");
  assert.match(app.downloads[0].name, /^vape-backup-.*\.json$/);
  assert.equal(app.fetchCalls, 0, "VAPE has no market-sourcing scan");
}

(async () => {
  await testTools();
  await testVape();
  process.stdout.write("Market interaction smoke tests passed.\n");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
