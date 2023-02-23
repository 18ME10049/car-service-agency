const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());

const dbPath = path.resolve(__dirname, 'carservice.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the database.');
  }
});


db.run(`CREATE TABLE IF NOT EXISTS operator_availability (
  id INTEGER PRIMARY KEY,
  operator_id TEXT NOT NULL,
  available_slots TEXT NOT NULL)`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('operator_availability table created successfully');
  }
});

db.run(`CREATE TABLE IF NOT EXISTS appointments (
  appointment_id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  customer_id TEXT NOT NULL)`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('appointments table created successfully');
  }
});


// returns available slots for given operator id from the operator_availability table. 
function getAvailabileSlotsForGivenOperator(operator_id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT available_slots FROM operator_availability WHERE operator_id = ?`,
      operator_id,
      (err, row) => {
        if (err) {
          console.error(err.message);
          reject('Error retrieving service operator availability');
        } else if (!row) {
          // If availability slot doesn't exist, create a new one
          // for a day a string of 24 length with all zeros each representing start_time
          const availableSlots = '0'.repeat(24);
          db.run(
            `INSERT INTO operator_availability (operator_id, available_slots) VALUES (?, ?)`,
            [operator_id, availableSlots],
            (err) => {
              if (err) {
                console.error(err.message);
                reject('Error in creating operator availability slot');
              } else {
                resolve(availableSlots);
              }
            }
          );
        } else {
          resolve(row.available_slots);
        }
      }
    );
  });
}

//updates operator_availability table in the database with given available_slots for a given operator id
function updateOperatorAvailability(operator_id, available_slots) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE operator_availability SET available_slots = ? WHERE operator_id = ?`,
      [available_slots, operator_id],
      function (err) {
        if (err) {
          console.error(err.message);
          reject(err.message);
        } else {
          console.log(`available_slots updated for operator ${operator_id}`);
          resolve(`available_slots updated for operator ${operator_id}`);
        }
      }
    );
  });
}

// updates available_slot status for a given start_time for a given operator id. 
function modifyAvailableSlot(operator_id, start_time) {
  return new Promise((resolve, reject) => {
    getAvailabileSlotsForGivenOperator(operator_id)
      .then(available_slots => {
        console.log("available_slots :", available_slots);
        start_time = parseInt(start_time);
        available_slots = available_slots.substr(0, start_time) + '0' + available_slots.substr(start_time + 1);
        return updateOperatorAvailability(operator_id, available_slots);
      })
      .then(result => {
        // console.log(result);
        resolve();
      })
      .catch(error => {
        console.error(error);
        reject(`error in modifying available_slot for ${operator_id}`);
      });
  });
}



// delete a row from appointments table for given appointment id. 
function cancelAppointment(appointmentId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM appointments WHERE appointment_id = ?`, [appointmentId], function (err) {
      if (err) {
        reject(err);
      } else if (this.changes === 0) {
        reject('Appointment not found');
      } else {
        resolve(`Appointment ${appointmentId} canceled successfully`);
      }
    });
  });
}



// POST api to schedule an appointment
app.post('/schedule-appointment', async (req, res) => {
  
  const { operator_id, start_time, customer_id } = req.body;
  let availabilitySlots;

  // Check that start_time is within a valid range (0-23)
  if (start_time <= 0 || start_time >= 23) {
    return res.status(400).json({ message: "Invalid start_time. Please provide a value from 0 and 23." });
  }

  try {
    availabilitySlots = await getAvailabileSlotsForGivenOperator(operator_id);
    // console.log("availabilitySlots :", availabilitySlots);
  } catch (error) {
    console.log(error);
    return res.status(500).send(`error in fetching available_slot for ${operator_id}`);
  }

  // check if the given slot is already booked
  if (availabilitySlots[start_time] == '1') {
    console.log("Given Slot Already Booked");
    return res.status(500).send('Given Slot Already Booked');
  }

  else{
      // if slot is available update it by making avilable_slot 1 at given start_time index. 
  availabilitySlots = availabilitySlots.substr(0, start_time) + '1' + availabilitySlots.substr(start_time + 1);

  try {
    const result = await updateOperatorAvailability(operator_id, availabilitySlots);
    console.log(result);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`error in update available_slot for ${operator_id}`);
  }


  // Generate unique appointment ID
  const appointment_id = `${start_time}_${operator_id}_${customer_id}`;

  // Insert new appointment into database
  db.run(`INSERT INTO appointments (appointment_id, operator_id, start_time, customer_id)
    VALUES (?, ?, ?, ?)`,
    [appointment_id, operator_id, start_time, customer_id],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error scheduling appointment');
      } else {
        const appointmentDetails = {
          appointment_id: appointment_id,
          operator_id: operator_id,
          start_time: start_time,
          customer_id: customer_id
        };
        const message = 'Appointment scheduled successfully';
        console.log(`Appointment ${appointment_id} scheduled.`);
        return res.status(200).json({ message, appointmentDetails });
      }
    });
  }
});


// DELETE api to cancel an appointment with given appointment id
app.delete('/appointments/:appointmentId', async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    console.log(appointmentId);
    let [start_time, operator_id] = appointmentId.split('_');
    const result = await cancelAppointment(appointmentId);
    const result2 = await modifyAvailableSlot(operator_id, start_time);
    return res.status(200).json({ message: result });
  } catch (error) {
    if(error === 'Appointment not found'){
      console.log('Appointment not found');
      res.status(404).json('Appointment not found');
    } else {
      console.error(error);
      res.status(500).send('Error canceling appointment');
    }
  }
});


// GET api provides all booked appointments for given operator_id
app.get('/booked-appointments/:operator_id', async (req, res) => {
  try {
    const operator_id = req.params.operator_id;
    try {
      availabilitySlots = await getAvailabileSlotsForGivenOperator(operator_id);
      let bookedSlot = []
      for (let i = 0; i < 24; i++) {
        if (availabilitySlots[i] == '1') {
          bookedSlot.push(i + "-" + (i + 1) % 24);
        }
      }
      res.status(200).json({bookedSlot});
    } catch (error) {
      console.log(error);
      res.status(500).send('Error in getting slot details for given operator id');
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching booked slots');
  }
});

// GET api provides all open appointments for given operator_id
app.get('/open-appointments/:operator_id', async (req, res) => {
  try {
    const operator_id = req.params.operator_id;
    try {
      availabilitySlots = await getAvailabileSlotsForGivenOperator(operator_id);
      let openSlots = []
      let count = 0;
      for (let i = 0; i < 24; i++) {
        if (availabilitySlots[i] == '1') {
          if (count > 0) openSlots.push((i - count) + "-" + (i)), count = 0;
        }
        else count++;
      }
      if (count > 0) openSlots.push((24 - count) + "-" + (0));
      res.status(200).json({openSlots});
    } catch (error) {
      console.log(error);
      res.status(500).send('Error in fetching available slots details for given operator');
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching booked slots');
  }
});

// PUT api to reschedule an appointment with given appointment id and new start_time
app.put('/appointments/:appointmentID', async (req, res) => {
  try {
    const appointmentId = req.params.appointmentID;
    const newStartTime = req.body.start_time;
    let [start_time, operator_id, customer_id] = appointmentId.split('_');
     // Check that start_time is within a valid range (0-23)
    if (newStartTime <= 0 || newStartTime >= 23) {
      return res.status(400).json({ message: "Invalid start_time. Please provide a value from 0 and 23." });
    }
    try {
      availabilitySlots = await getAvailabileSlotsForGivenOperator(operator_id);
    } catch (error) {
      console.log(error);
      res.status(500).json({error});
    }
    if (availabilitySlots[start_time] == '0') {
      message  = "appointment with given id does not exists";
      return res.status(500).json({message});
    }
    if (availabilitySlots[newStartTime] == '1') {
      message  = "Given slot it already booked choose open slot time";
      return res.status(500).json({message});
    }
    try{
      const cancelResult = await cancelAppointment(appointmentId);
    }
    catch(error){
      return res.status(500).json({error});
    }
    start_time = parseInt(start_time);
    availabilitySlots = availabilitySlots.substr(0, start_time) + '0' + availabilitySlots.substr(start_time + 1);
    availabilitySlots = availabilitySlots.substr(0, newStartTime) + '1' + availabilitySlots.substr(newStartTime + 1);

    try {
      const result = await updateOperatorAvailability(operator_id, availabilitySlots);
      console.log(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({error});
    }

    // Generate unique appointment ID
    const appointment_id = `${newStartTime}_${operator_id}_${customer_id}`;

    // Insert new appointment into database
    db.run(`INSERT INTO appointments (appointment_id, operator_id, start_time, customer_id)
    VALUES (?, ?, ?, ?)`,
      [appointment_id, operator_id, newStartTime, customer_id],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({err});
        } else {
          const appointmentDetails = {
            appointment_id: appointment_id,
            operator_id: operator_id,
            start_time: newStartTime,
            customer_id: customer_id
          };
          const message = 'Appointment re-scheduled successfully';
          console.log(`Appointment ${appointment_id} re-scheduled.`);
          return res.status(200).json({ message, appointmentDetails });
        }
      });
  } catch (error) {
    console.error(error);
    message = 'Error rescheduling appointment'
    return res.status(500).json({message, error});
  }
});


app.listen(3001, () => {
  console.log('Server listening on port 3001');
});
