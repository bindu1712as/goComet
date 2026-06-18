# API Test Scenarios

## Get User Details
- Endpoint: `/users/1`
- Method: `GET`
- Payload: None
- Expected Status: `200`
- Assertions:
  - `id` = `1`
  - `username` = `Bret`

## Create Post
- Endpoint: `/posts`
- Method: `POST`
- Payload:
  ```json
  {
    "title": "Playwright API Framework",
    "body": "API Testing Example",
    "userId": 1
  }
  ```
- Expected Status: `201`
- Assertions:
  - `title` matches request
  - `userId` matches request

## Patch Post
- Endpoint: `/posts/1`
- Method: `PATCH`
- Payload:
  ```json
  {
    "title": "Updated Title"
  }
  ```
- Expected Status: `200`
- Assertions:
  - `title` = `Updated Title`
