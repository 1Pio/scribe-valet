import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StoragePathSettings } from "./StoragePathSettings";

describe("StoragePathSettings", () => {
  it("shows only active path by default", () => {
    const html = renderToStaticMarkup(
      <StoragePathSettings activePath="C:/Users/A/models" onChangePath={vi.fn()} />
    );

    expect(html).toContain("Active path:");
    expect(html).toContain("C:/Users/A/models");
    expect(html).toContain("Change path directory");
    expect(html).not.toContain("Create directory if missing");
  });

  it("renders inline path change controls when expanded", () => {
    const html = renderToStaticMarkup(
      <StoragePathSettings
        activePath="C:/Users/A/models"
        defaultExpanded={true}
        onChangePath={vi.fn()}
      />
    );

    expect(html).toContain("Directory");
    expect(html).toContain("value=\"C:/Users/A/models\"");
    expect(html).toContain("Create directory if missing");
    expect(html).toContain("Apply path");
  });
});
