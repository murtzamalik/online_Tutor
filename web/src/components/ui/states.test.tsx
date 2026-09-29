import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./states";

describe("Shell-07 EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="Nothing here" body="Yet" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});
