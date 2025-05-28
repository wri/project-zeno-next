# Error Handling Testing

This document explains how to test the LangChain error handling functionality using environment variables.

## How It Works

When the `TEST_ERROR` environment variable is set, the main chat API (`/api/chat`) will call the local test-error endpoint instead of the real Zeno API. This ensures we test the same pipeline that processes LangChain responses.

## Testing Steps

### 1. Set the Environment Variable

Choose one of these error types to test:

```bash
# Test validation errors (like the original pydantic error)
export TEST_ERROR=validation

# Test timeout errors  
export TEST_ERROR=timeout

# Test permission errors
export TEST_ERROR=permission

# Test unknown errors (default)
export TEST_ERROR=unknown
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Use the Chat Interface Normally

- Open your browser to `http://localhost:3000`
- Type any message in the chat interface
- Click send

### 4. Observe the Results

You should see:
1. Your user message appears
2. An error message with red styling and "Error" badge appears
3. A follow-up assistant message confirming the system continues working

## Testing Different Scenarios

```bash
# Test validation error (most common)
TEST_ERROR=validation npm run dev

# Test timeout scenario
TEST_ERROR=timeout npm run dev

# Test permission denied
TEST_ERROR=permission npm run dev

# Test unknown error
TEST_ERROR=unknown npm run dev

# Normal mode (no testing)
unset TEST_ERROR
npm run dev
```