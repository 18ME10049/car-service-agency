# Car Service Agency

This project is a REST API with a backend SQL database as the data store. It implements the 5 APIs that are mentioned in deatils below the file: 

This project is an online scheduler website for a car service agency. The agency has many service operators who must take appointments for customers for a limited time. The purpose of this project is to provide an easy-to-use online scheduler that allows customers to book appointments with the service operators.

## Note

Please follow the instructions below to run this project

## Requirements

1. Node.js and npm (Node Package Manager) [Download Link](https://nodejs.org/en/download/)
2. SQLite database file using a tool like DB Browser for SQLite [Download link](https://sqlitebrowser.org/dl/) download installer and install it to view a simple GUI for database. 
3. Postman Extension [Download Link](https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop?hl=en) install POSTMAN to test APIs

## Getting Started

To get started with the online scheduler website, follow these steps:

1. Clone the repository to your local machine.
2. Install the dependencies using `npm install`.
3. Create a .env file with your environment variables. (Optional)
4. Once you have installed DB Browser for SQLite, run the `index.js` file using the command `node index.js`. You should be able to see your backend server running on `PORT 3001`.
5. After successfully running the server, you will also see the `carservice.db` file in the root directory of your project. Open this file with `DB Browser for SQLite` by clicking `carservice.db` and selecting SQLite from `C:\Program Files\DB Browser` for SQLite and select DB Browser for SQLite.
6. You will see two tables created in the database: `appointments` and operator `availability`.
Specifications for each table are given below.

## Project Assumptions

For this project, the following assumptions have been made:

1. There are only 3 service operators with id (op1, op2, op3).
2. Only 1 customer (with id as cust1) is there who is making API calls for scheduling.
3. This is valid only for 1-day scheduling, meaning 24hr scheduling.

## Appointments Table Specification

The appointments table has the following columns:

1. `appointment_id`: TEXT PRIMARY KEY

2. `operator_id`: TEXT NOT NULL

3. `start_time`: INTEGER NOT NULL

4. `customer_id`: TEXT NOT NULL

5. `appointment_id` is calculated with the help of `start_time`, `operator_id`, and `customer_id` so that there is flexibility to get the `start_time` and `operator_id` without making a query to the database for a given `appointment_id`.

6. `operator_id` will have three unique values in this case [op1, op2, op3].

7. `start_time` is an integer that can take values from 0 to 23 (both inclusive to take into account the 24-hour limitations).

8. `customer_id` is the ID of the customer making the API call. Here, only cust1 is considered.

## Operator Availability Table Specification

The `operator_availability` table has the following columns:

1. `id`: INTEGER PRIMARY KEY

2. `operator_id`: TEXT NOT NULL

3. `available_slots`: TEXT NOT NULL

4. `id` is the primary key for the table.

5. `operator_id` is the same as the `operator_id` in the appointments table.

6. `available_slots` is a text value of 24 long length string with only 0's and 1's values. For example, the value at the 12th index of available_slot for operator_id op1 is 0, which means that the 12-13 hour slot is open for that operator. If it is 1, that means it is already booked.


## Testing APIs

To test the APIs of the online scheduler website, you can use a tool like Postman. Here are the steps to test the APIs:

1.  Schedule Appointment API: To schedule an appointment, use the `schedule-appointment` API with POST method. Set the request data in raw body format with `operator_id`, `start_time`, and `customer_id`. For example:
```
POST http://localhost:3001/schedule-appointment
Request Body:
{
	"operator_id":"op1",
	"start_time": 7,
	"customer_id": "cust1"
}

```

You will receive a response with a success message and appointment details.

```
response = 

{
    "message": "Appointment scheduled successfully",
    "appointmentDetails": {
        "appointment_id": "7_op1_cust1",
        "operator_id": "op1",
        "start_time": 7,
        "customer_id": "cust1"
    }
}
```

2. Cancel Appointment API: To cancel an appointment, use the `appointments/:id` API with DELETE method. Add the appointment id (in the format of appointment_id: `start_time_operator_id_customer_id`) at the end of the URL. In the headers, add 
Content-Type = application/json. For example:

```
DELETE http://localhost:3001/appointments/7_op1_cust1
Headers:
Content-Type: application/json
```

You will receive a response with a success message.

```
response = {
    "message": "Appointment 9_op1_cust1 canceled successfully"
}
```

3. Reschedule Appointment API: To reschedule an appointment, use the `appointments/:id` API with PUT method. Add the appointment id (in the format of appointment_id: `start_time_operator_id_customer_id`) at the end of the URL. In the headers, add Content-Type = application/json and set the request data in raw body format with the new start_time. For example:

```
PUT http://localhost:3001/appointments/12_op2_cust1
Headers:
Content-Type: application/json
Request Body:
{
	"start_time": 16
}
```

You will receive a response with a success message and appointment details.

```
response = {
    "message": "Appointment re-scheduled successfully",
    "appointmentDetails": {
        "appointment_id": "16_op2_cust1",
        "operator_id": "op2",
        "start_time": 16,
        "customer_id": "cust1"
    }
}
```


4. Booked Slots for Operator API: To get the booked slots for an operator, use the `booked-appointments/:operator_id` API with GET method. Add the `operator_id` at the end of the URL. For example:

```
GET http://localhost:3001/booked-appointments/op1
```

You will receive a response with an array of booked slots for the operator.

```
response = {
    "bookedSlot": [
        "0-1",
        "15-16",
        "23-0"
    ]
}
```

5. Open Slots for Operator API: To get the open slots for an operator, use the `open-appointments/:operator_id` API with GET method. Add the operator id at the end of the URL. For example:

```
GET http://localhost:3001/open-appointments/op2
```

You will receive a response with an array of open slots for the operator.

```
response = {
    "openSlots": [
        "0-13",
        "14-15",
        "16-0"
    ]
}

```