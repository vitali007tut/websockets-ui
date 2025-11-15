# RSSchool NodeJS WebSocket Task Template
> Static HTTP server plus task dependencies.  
> Frontend connects to `ws://localhost:3000` by default.

## Installation
1. Clone/download repo
2. `npm install`

## Usage
**Development**

`npm run start:dev`

* Serves app @ `http://localhost:8181` with nodemon

**Production**

`npm run start`

* Serves app @ `http://localhost:8181` without nodemon

---

**All commands**

Command | Description
--- | ---
`npm run start:dev` | App served @ `http://localhost:8181` with nodemon
`npm run start` | App served @ `http://localhost:8181` without nodemon

**Note**: replace `npm` with `yarn` in `package.json` if you prefer yarn.

---

## Battleship assignment references
- Requirements: [assignment.md](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/battleship/assignment.md)
- Scoring: [score.md](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/battleship/score.md)

We will keep the implementation notes within commits/issues; no extra docs bundled.

## Manual check cheatsheet
1. `npm run start:dev`
2. Open `http://localhost:8181` (built frontend) or connect via `wscat -c ws://localhost:3000`
3. Follow the flows described in the assignment links above.