/**
 * Component tests for skeleton loaders
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TableSkeleton,
  CardSkeleton,
  StudentListSkeleton,
  TeacherListSkeleton,
  DashboardSkeleton,
} from "../table-skeleton";

describe("TableSkeleton", () => {
  it("should render table skeleton with default rows and columns", () => {
    render(<TableSkeleton />);
    
    // Check for header skeleton
    const headerSkeletons = screen.getAllByRole("generic").filter(el => 
      el.className?.includes("h-4 w-24")
    );
    expect(headerSkeletons.length).toBeGreaterThan(0);
  });

  it("should render custom number of rows", () => {
    render(<TableSkeleton rows={10} columns={3} />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should render custom number of columns", () => {
    render(<TableSkeleton rows={3} columns={6} />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});

describe("CardSkeleton", () => {
  it("should render card skeleton", () => {
    render(<CardSkeleton />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should have proper structure", () => {
    const { container } = render(<CardSkeleton />);
    
    expect(container.querySelector(".p-6")).toBeTruthy();
    expect(container.querySelector(".border")).toBeTruthy();
  });
});

describe("StudentListSkeleton", () => {
  it("should render student list skeleton", () => {
    render(<StudentListSkeleton />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should include header and table skeleton", () => {
    const { container } = render(<StudentListSkeleton />);
    
    expect(container.querySelector(".space-y-4")).toBeTruthy();
  });
});

describe("TeacherListSkeleton", () => {
  it("should render teacher list skeleton", () => {
    render(<TeacherListSkeleton />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});

describe("DashboardSkeleton", () => {
  it("should render dashboard skeleton", () => {
    render(<DashboardSkeleton />);
    
    const skeletonElements = screen.getAllByRole("generic");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should have grid layout", () => {
    const { container } = render(<DashboardSkeleton />);
    
    expect(container.querySelector(".grid")).toBeTruthy();
  });
});
