# Inworld AI Verification Prototype

This directory contains a verification prototype to test the feasibility of using Inworld AI for the AI-TRPG platform.

## Purpose

This prototype validates whether Inworld AI can meet the requirements for an immersive AI-driven TRPG platform by testing:

1. **SDK Installation** - Verify the Node.js SDK works correctly
2. **Authentication** - Test API key authentication
3. **Character Dialogue** - Verify character creation and conversation capabilities
4. **Memory Functionality** - Test built-in memory and context persistence
5. **Judgment System Feasibility** - Analyze integration possibilities for custom game mechanics

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Inworld AI credentials:

```env
INWORLD_API_KEY=your-inworld-api-key
INWORLD_JWT_KEY=your-jwt-key
INWORLD_JWT_SECRET=your-jwt-secret
INWORLD_WORKSPACE_ID=your-workspace-id
INWORLD_SCENE_ID=your-scene-id
INWORLD_CHARACTER_ID=your-character-id
```

### 3. Getting Inworld AI Credentials

1. Visit [Inworld Studio](https://studio.inworld.ai/)
2. Create an account and workspace
3. Create a character for testing
4. Generate API keys from the dashboard
5. Copy the credentials to your `.env` file

## Running the Verification

### Run All Tests

```bash
npm run test
```

### Development Mode

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

## Test Coverage

### 1. SDK Installation Test
- Verifies the @inworld/nodejs-sdk package is correctly installed
- Checks if core classes are available
- Validates TypeScript integration

### 2. Authentication Test
- Tests API key authentication with Inworld services
- Verifies JWT token configuration
- Validates client initialization

### 3. Character Dialogue Test
- Tests basic character interaction capabilities
- Verifies conversation flow
- Validates message handling

### 4. Memory Functionality Test
- Tests built-in memory features
- Verifies context persistence
- Validates relationship tracking

### 5. Judgment System Feasibility Test
- Analyzes custom game mechanics integration
- Tests dice rolling and stat calculation feasibility
- Validates middleware integration possibilities

## Results

After running the tests, you'll find detailed reports in:

- `verification-report.json` - Machine-readable test results
- `verification-report.md` - Human-readable summary report

## Expected Outcomes

### Success Scenario
If all tests pass, the verification confirms that:
- Inworld AI is suitable for the AI-TRPG platform
- Built-in memory features can simplify development
- Custom judgment systems can be integrated
- The platform should proceed with Inworld AI as the primary AI service

### Failure Scenario
If tests fail, the verification will:
- Identify specific compatibility issues
- Provide recommendations for alternatives
- Suggest fallback to OpenAI GPT or Anthropic Claude
- Document limitations for future reference

## Technical Architecture

```
inworld-verification/
├── src/
│   ├── index.ts          # Main entry point
│   ├── verification.ts   # Core verification logic
│   └── test.ts          # Test runner
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Environment template
└── README.md           # This file
```

## Integration with Main Platform

The verification results will inform the main platform architecture:

- **Success**: Implement Inworld AI integration in the main backend
- **Failure**: Implement OpenAI/Claude integration as fallback
- **Partial**: Hybrid approach with Inworld AI for specific features

## Next Steps

Based on verification results:

1. **If Successful**: Proceed with full Inworld AI integration
2. **If Failed**: Implement alternative AI service integration
3. **Documentation**: Update main project documentation with findings
4. **Architecture**: Design main platform based on AI service capabilities

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API keys are correct
   - Check workspace and character setup in Inworld Studio
   - Ensure JWT credentials are properly configured

2. **SDK Installation Issues**
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version compatibility (requires Node 16+)
   - Verify TypeScript configuration

3. **Environment Variables**
   - Ensure `.env` file exists and contains all required variables
   - Check that environment variables are properly loaded

### Getting Help

- Check the [Inworld AI Documentation](https://docs.inworld.ai/)
- Review the generated verification reports for detailed error messages
- Consult the main project's CLAUDE.md for additional guidance

## License

This verification prototype is part of the AI-TRPG Platform project and follows the same license terms.