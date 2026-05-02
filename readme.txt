Instructions to Start QueueSmart

Prerequisites:
node.js installed
MySQL Workbench installed


Steps to Run Project

1.Create '.env' File
	Inside the Project queueSmart/backend/
	Create file named exactly ".env" that follows this structure

	DB_HOST=localhost
	DB_USER=root
	DB_PASSWORD=yourLocalMysqlPassword
	DB_NAME=queueSmart
	DB_PORT=3306
	PORT=3000

	Replace yourPasswordHere with your local MySQL password

2. Open MySQL Workbench
	run these files in order
		schema.sql
		service-seed.sql
		
	Open a new query window and type 
		USE queueSmart;
	Optionally type this to check that data has been properly seeded
		select * from Service;

3. Install backend dependencies and run server
	Open a terminal in the backend/ folder and type
		npm install
	afterwards Type
		npm start
	Then open the browser and go to http://localhost:3000
	

Testing:
To go to the dashboard click on the QueueSmart logo at the top of the page.
To view the website with administrator privileges you must update the role in the db with this

	update UserCredentials
	set role = 'administrator'
	where email = 'emailYouRegisteredWithHere';

To open multiple users at a time
	Open an incognito window if using chrome
	go to http://localhost:3000
	sign up as a new user

Extra:
The `.env` file should match the local MySQL connection being used in MySQL Workbench. For a local setup `DB_HOST=localhost`, `DB_USER=root` and `DB_PORT=3306`. The `DB_PASSWORD` value should be the same password used to connect to MySQL workbench.
.env file should not be commit as it is private.