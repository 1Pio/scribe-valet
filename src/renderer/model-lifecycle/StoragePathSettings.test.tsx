import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StoragePathSettings } from "./StoragePathSettings";

describe("StoragePathSettings", () => {
  it("shows only active path by default", () => {
    const html = renderToStaticMarkup(
      <StoragePathSettings
        activePath="C:/Users/A/models"
        expectedPathHint="C:/Users/A/models"
        onChangePath={vi.fn()}
      />
    );

    expect(html).toContain("Active path:");
    expect(html).toContain("C:/Users/A/models");
    expect(html).toContain("Expected models path:");
    expect(html).toContain("Change model location");
    expect(html).not.toContain("Missing directories are created automatically");
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
    expect(html).toContain("Missing directories are created automatically");
    expect(html).toContain("Apply location");
  });
});
