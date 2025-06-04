import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TestRequestPanel from "./TestRequestPanel";

// Mock fetch
global.fetch = jest.fn();

// Mock Lucide React icons
jest.mock("lucide-react", () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Edit3: () => <div data-testid="edit3-icon">Edit3</div>,
  Trash2: () => <div data-testid="trash2-icon">Trash2</div>,
  AlertTriangle: () => (
    <div data-testid="alert-triangle-icon">AlertTriangle</div>
  ),
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  Loader: () => <div data-testid="loader-icon">Loader</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
}));

describe("TestRequestPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  test("renders main components", () => {
    render(<TestRequestPanel />);

    expect(screen.getByText("API Test Panel")).toBeInTheDocument();
    expect(
      screen.getByText("Test your endpoints efficiently")
    ).toBeInTheDocument();
    expect(screen.getByText("Base URL:")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  test("displays default base URL", () => {
    render(<TestRequestPanel />);

    expect(
      screen.getByDisplayValue("https://jsonplaceholder.typicode.com/posts")
    ).toBeInTheDocument();
  });

  test("switches between tabs", () => {
    render(<TestRequestPanel />);

    // Default tab should be basic
    expect(screen.getByText("GET Request")).toBeInTheDocument();

    // Click on Axios tab
    fireEvent.click(screen.getByText("Axios"));
    expect(screen.getByText("Axios GET")).toBeInTheDocument();

    // Click on Redux tab
    fireEvent.click(screen.getByText("Redux Thunk"));
    expect(screen.getByText("Thunk GET")).toBeInTheDocument();

    // Click on Error tab
    fireEvent.click(screen.getByText("Error Test"));
    expect(screen.getByText("Trigger Test Error")).toBeInTheDocument();
  });

  test("edits base URL", () => {
    render(<TestRequestPanel />);

    // Click edit button
    const editButton = screen.getByTestId("edit-icon").closest("button");
    fireEvent.click(editButton!);

    // Should show input field
    const input = screen.getByPlaceholderText("Enter API base URL");
    expect(input).toBeInTheDocument();

    // Change URL
    fireEvent.change(input, { target: { value: "https://api.example.com" } });

    // Click save button
    const saveButton = screen.getByTestId("check-icon").closest("button");
    fireEvent.click(saveButton!);

    // Should display new URL
    expect(screen.getByText("https://api.example.com")).toBeInTheDocument();
  });

  test("cancels URL editing", () => {
    render(<TestRequestPanel />);

    // Click edit button
    const editButton = screen.getByTestId("edit-icon").closest("button");
    fireEvent.click(editButton!);

    // Change URL
    const input = screen.getByPlaceholderText("Enter API base URL");
    fireEvent.change(input, { target: { value: "https://api.example.com" } });

    // Click cancel button
    const cancelButton = screen.getByTestId("x-icon").closest("button");
    fireEvent.click(cancelButton!);

    // Should revert to original URL
    expect(
      screen.getByText("https://jsonplaceholder.typicode.com/posts")
    ).toBeInTheDocument();
  });

  test("makes successful GET request", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Test Post" }),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<TestRequestPanel />);

    // Click GET Request button
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    // Should show loading state
    expect(screen.getByText("Processing...")).toBeInTheDocument();

    // Wait for request to complete
    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Check if fetch was called correctly
    expect(fetch).toHaveBeenCalledWith(
      "https://jsonplaceholder.typicode.com/posts/1",
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    // Check stats update
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument(); // Success count
    });
  });

  test("makes successful POST request", async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      json: async () => ({ id: 2, title: "foo", body: "bar", userId: 1 }),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<TestRequestPanel />);

    // Click POST Request button
    const postButton = screen.getByText("POST Request");
    fireEvent.click(postButton);

    // Wait for request to complete
    await waitFor(() => {
      expect(screen.getByText("POST Request")).toBeInTheDocument();
    });

    // Check if fetch was called correctly
    expect(fetch).toHaveBeenCalledWith(
      "https://jsonplaceholder.typicode.com/posts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }),
      }
    );
  });

  test("handles request error", async () => {
    const mockError = new Error("Network error");
    (fetch as jest.Mock).mockRejectedValueOnce(mockError);

    render(<TestRequestPanel />);

    // Click GET Request button
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    // Wait for request to complete
    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Check error stats
    await waitFor(() => {
      const errorElements = screen.getAllByText("1");
      expect(errorElements.length).toBeGreaterThan(0); // Error count
    });
  });

  test("triggers error test", async () => {
    render(<TestRequestPanel />);

    // Switch to error tab
    fireEvent.click(screen.getByText("Error Test"));

    // Click trigger error button
    const errorButton = screen.getByText("Trigger Test Error");
    fireEvent.click(errorButton);

    // Should show loading state
    expect(screen.getByText("Processing...")).toBeInTheDocument();

    // Wait for error to complete
    await waitFor(
      () => {
        expect(screen.getByText("Trigger Test Error")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test("opens and closes edit modal", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Test Post" }),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<TestRequestPanel />);

    // Make a request first to create log entry
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Wait for log to appear and click edit button
    await waitFor(() => {
      const editButtons = screen.getAllByTestId("settings-icon");
      expect(editButtons.length).toBeGreaterThan(0);
      fireEvent.click(editButtons[0].closest("button")!);
    });

    // Modal should be open
    expect(screen.getByText("Edit & Replay Request")).toBeInTheDocument();
    expect(screen.getByText("Method:")).toBeInTheDocument();
    expect(screen.getByText("URL:")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByTestId("x-icon").closest("button");
    fireEvent.click(closeButton!);

    // Modal should be closed
    await waitFor(() => {
      expect(
        screen.queryByText("Edit & Replay Request")
      ).not.toBeInTheDocument();
    });
  });

  test("executes edited request", async () => {
    const mockResponse1 = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Test Post" }),
    };
    const mockResponse2 = {
      ok: true,
      status: 200,
      json: async () => ({ id: 2, title: "Edited Post" }),
    };
    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2);

    render(<TestRequestPanel />);

    // Make initial request
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Open edit modal
    await waitFor(() => {
      const editButtons = screen.getAllByTestId("settings-icon");
      fireEvent.click(editButtons[0].closest("button")!);
    });

    // Change method to POST
    const methodSelect = screen.getByDisplayValue("GET");
    fireEvent.change(methodSelect, { target: { value: "POST" } });

    // Change URL
    const urlInput = screen.getByDisplayValue(
      "https://jsonplaceholder.typicode.com/posts/1"
    );
    fireEvent.change(urlInput, {
      target: { value: "https://api.example.com/test" },
    });

    // Add request body
    const bodyTextarea = screen.getByPlaceholderText('{\n  "key": "value"\n}');
    fireEvent.change(bodyTextarea, { target: { value: '{"test": "data"}' } });

    // Execute request
    const executeButton = screen.getByText("Execute Request");
    fireEvent.click(executeButton);

    // Wait for request to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("https://api.example.com/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      });
    });
  });

  test("clears request log", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Test Post" }),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<TestRequestPanel />);

    // Make a request
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("Request/Response Log")).toBeInTheDocument();
    });

    // Clear log
    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    // Log should be hidden
    await waitFor(() => {
      expect(
        screen.queryByText("Request/Response Log")
      ).not.toBeInTheDocument();
    });
  });

  test("validates JSON in edit modal", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Test Post" }),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Mock window.alert
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<TestRequestPanel />);

    // Make initial request
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Open edit modal
    await waitFor(() => {
      const editButtons = screen.getAllByTestId("settings-icon");
      fireEvent.click(editButtons[0].closest("button")!);
    });

    // Change method to POST
    const methodSelect = screen.getByDisplayValue("GET");
    fireEvent.change(methodSelect, { target: { value: "POST" } });

    // Add invalid JSON
    const bodyTextarea = screen.getByPlaceholderText('{\n  "key": "value"\n}');
    fireEvent.change(bodyTextarea, { target: { value: "invalid json" } });

    // Execute request
    const executeButton = screen.getByText("Execute Request");
    fireEvent.click(executeButton);

    // Should show alert for invalid JSON
    expect(alertSpy).toHaveBeenCalledWith("Invalid JSON in request body");

    alertSpy.mockRestore();
  });

  test("displays stats correctly", async () => {
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, title: "Success" }),
    };
    const mockError = new Error("Network error");

    (fetch as jest.Mock)
      .mockResolvedValueOnce(mockSuccessResponse)
      .mockRejectedValueOnce(mockError);

    render(<TestRequestPanel />);

    // Make successful request
    const getButton = screen.getByText("GET Request");
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Make failed request
    fireEvent.click(getButton);

    await waitFor(() => {
      expect(screen.getByText("GET Request")).toBeInTheDocument();
    });

    // Check stats - should show 1 success and 1 error
    await waitFor(() => {
      const statValues = screen.getAllByText("1");
      expect(statValues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
