import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import { getAPIRequestHeaders, getAuthToken, getSessionToken } from "@/app/api/shared/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checkpointId: string }> }
) {
  try {
    const { id, checkpointId } = await params;
    let token = await getAuthToken();
    if (!token) {
      token = await getSessionToken();
    }

    // Forward content-type for CSV/JSON
    const contentType = request.headers.get("content-type") || "text/csv";

    const url = `${API_CONFIG.ENDPOINTS.THREADS}/${id}/${checkpointId}/raw_data`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
    });

    // Forward status and headers, and stream the body
    if (!response.ok) {
      return NextResponse.json(
        { error: "Upstream API error", status: response.status },
        { status: response.status }
      );
    }
  
    const body = await response.text(); // for CSV or JSON
    // If the content contains Python dict data, convert it to proper CSV
    let processedBody = body;
    if (contentType === "text/csv" && (body.includes("{'") || body.includes("\"{'") || body.includes("'}") )) {
      try {
        const lines = body.trim().split('\n');
        const allDatasets = [];

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip empty lines and non-dict lines (like "ESP,9710,555609634")
          if (!trimmedLine || (!trimmedLine.includes("{'") && !trimmedLine.includes("':"))) {
            continue;
          }

          try {
            let dictString = trimmedLine;

            // Handle quoted Python dict format
            if (dictString.startsWith("\"{'") && dictString.endsWith("'}\"")) {
              dictString = dictString.slice(1, -1); // Remove outer quotes
            }
            // Handle trailing comma cases
            if (dictString.endsWith('",')) {
              dictString = dictString.slice(0, -1); // Remove trailing comma
            }
            if (dictString.endsWith('"')) {
              dictString = dictString.slice(0, -1); // Remove trailing quote
            }

            // Convert Python dict to JSON
            const jsonString = dictString.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
            const data = JSON.parse(jsonString);

            if (data && typeof data === 'object') {
              allDatasets.push(data);
            }
          } catch (lineParseError) {
            console.error('Failed to parse line:', trimmedLine.substring(0, 100) + '...', lineParseError);
            continue;
          }
        }

        // Process all datasets and create a unified CSV
        if (allDatasets.length > 0) {
          const csvRows = [];
          let headerAdded = false;

          for (const data of allDatasets) {
            const keys = Object.keys(data);

            // Add header row only once (use the first dataset's keys)
            if (!headerAdded) {
              csvRows.push(keys.join(','));
              headerAdded = true;
            }

            // Check if values are arrays (columnar data)
            const firstKey = keys[0];
            if (Array.isArray(data[firstKey])) {
              const arrayLength = data[firstKey].length;

              // Add data rows
              for (let i = 0; i < arrayLength; i++) {
                const row = keys.map(key => {
                  const value = Array.isArray(data[key]) ? data[key][i] : data[key];
                  return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
                });
                csvRows.push(row.join(','));
              }
            } else {
              // Single row of data
              const values = keys.map(key => {
                const value = data[key];
                return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                  ? `"${value.replace(/"/g, '""')}"`
                  : value;
              });
              csvRows.push(values.join(','));
            }

            // Add a blank line between different datasets for clarity
            csvRows.push('');
          }

          // Remove the last empty line
          if (csvRows[csvRows.length - 1] === '') {
            csvRows.pop();
          }

          processedBody = csvRows.join('\n');
        }
      } catch (parseError) {
        console.error('Failed to parse and convert data to CSV:', parseError);
        // Fall back to original body if parsing fails
      }
    }

    return new NextResponse(processedBody, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        // Forward relevant headers (filename, etc.) if needed:
        ...(response.headers.get("Content-Disposition")
          ? { "Content-Disposition": response.headers.get("Content-Disposition")! }
          : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}