/**
 * Utility functions for handling Edge Function responses
 */

interface EdgeFunctionResponse<T = unknown> {
  data: T | null;
  error: {
    message: string;
    context?: Response;
  } | null;
}

interface EdgeFunctionResult {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Extract the actual error message from an Edge Function response.
 * Handles FunctionsHttpError by reading the JSON body from context.
 */
export async function getEdgeFunctionError(
  response: EdgeFunctionResponse<EdgeFunctionResult>
): Promise<string | null> {
  // No error
  if (!response.error && response.data?.success) {
    return null;
  }

  // Check if data contains an error message
  if (response.data?.error) {
    return response.data.error;
  }

  if (response.data?.message && !response.data?.success) {
    return response.data.message;
  }

  // Check if error has context (FunctionsHttpError)
  if (response.error?.context) {
    try {
      const ctx = response.error.context;
      // context is the Response object, try to read JSON
      if (ctx instanceof Response) {
        const cloned = ctx.clone();
        const json = await cloned.json();
        return json?.error || json?.message || response.error.message;
      }
    } catch {
      // Fall through to default
    }
  }

  // Default to error message
  return response.error?.message || 'An unexpected error occurred';
}

/**
 * Process an Edge Function response and return a standardized result.
 * Use this for consistent error handling across all Edge Function calls.
 */
export async function processEdgeFunctionResponse<T extends EdgeFunctionResult>(
  response: EdgeFunctionResponse<T>
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const error = await getEdgeFunctionError(response);
  
  if (error) {
    return { success: false, data: null, error };
  }

  return { success: true, data: response.data, error: null };
}
