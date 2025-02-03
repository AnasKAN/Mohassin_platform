# Mohassin Platform - Optimization as a Service

Welcome to the Mohassin Platform repository, an Optimization as a Service (OaaS) designed to provide efficient optimization solutions for crowd management and intelligent transportation.

## Website URL
[Visit Mohassin Platform](https://mohassin-platform-8d2f822fc902.herokuapp.com/)  

## Base URL for FastAPI Service
```
https://fastapi-mohassin-a6dc3af681d9.herokuapp.com/
```
## FastAPI Mohassin Service Repository
https://github.com/AnasKAN/fastapi-Mohassin

## About Mohassin
Mohassin is an Optimization as a Service (OaaS) platform designed to centralize optimization solutions. It allows researchers and developers to submit optimization problems, select solvers, and retrieve optimal solutions asynchronously.

### Key Features
- Optimization as a Service (OaaS)
- API Key Generation
- Submit Optimization Problems via API
- Monitor Process Status
- Fetch & Download Results
- Add Custom Solvers
- Admin Panel for Solver & User Management

## How to Use Mohassin API
To use the Mohassin API, follow these steps:

1. Generate an API Key from the API Help Page.
2. Submit Optimization Jobs using the API.
3. Monitor and Fetch Results.

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/submit-job?api_key=YOUR_API_KEY` | `POST` | Submit an optimization problem |
| `/job-result/{job_id}?api_key=YOUR_API_KEY` | `GET` | Fetch results of a submitted job |
| `/get-processes` | `GET` | Get the list of submitted jobs |

## Example Usage

### cURL (Windows)
```submitting a job
curl.exe -X POST "https://fastapi-mohassin-a6dc3af681d9.herokuapp.com/submit-job?api_key=YOUR_API_KEY" `
-H "Content-Type: application/json" `
--data "@C:\path\to\payload.json"
```
```fetching job results
curl.exe -X GET "https://fastapi-mohassin-a6dc3af681d9.herokuapp.com/job-result/YOUR_JOB_ID?api_key=YOUR_API_KEY"
```

### Python (Google Colab Notebook)
For a Python API tutorial, check out the Google Colab notebook:
[Python API Example - Mohassin](https://colab.research.google.com/drive/1yn9-xfeQH0yan_UbGqbz-8hdVhEFb55H?usp=sharing)

### JavaScript (Using Axios)
```javascript
const axios = require('axios');

const BASE_URL = "https://fastapi-mohassin-a6dc3af681d9.herokuapp.com";
const API_KEY = "YOUR_API_KEY";

async function submitJob(optimizerId, jobData) {
    try {
        const response = await axios.post(`${BASE_URL}/submit-job?api_key=${API_KEY}`, {
            optimizer_id: optimizerId,
            data: jobData
        });

        console.log("Job Submitted Successfully:", response.data);
        return response.data.job_id;
    } catch (error) {
        console.error("Error Submitting Job:", error.response ? error.response.data : error.message);
    }
}

async function getJobResult(jobId) {
    try {
        const response = await axios.get(`${BASE_URL}/job-result/${jobId}?api_key=${API_KEY}`);
        console.log("Job Result:", JSON.stringify(response.data, null, 4));
    } catch (error) {
        console.error("Error Fetching Job Result:", error.response ? error.response.data : error.message);
    }
}
// Example Usage
(async () => {
    const jobId = await submitJob(1, { example_param: "value" });
    if (jobId) await getJobResult(jobId);
})();
```

## Authentication & Security
-API Keys are required for all API requests.
-All user authentication is handled securely via sessions.
-Admins have exclusive access to manage users & solvers.

## Contributing
contributions are welcomed. To contribute:

Fork the repository

Create a new branch:
```
git checkout -b feature-branch
```
Commit your changes:
```
git commit -m "Add new feature"
```

## Main contributers 
-Anas Aldadi
