const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const { format } = require("date-fns");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDBandServer = async (request, response) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const isInvalidProperty = (request, response, next) => {
  let status, priority, category;
  const requestBody = request.body;

  if (Object.keys(requestBody).length === 0) {
    status = request.query.status;
    priority = request.query.priority;
    category = request.query.category;
    due_date = request.query.due_date;
  } else {
    status = requestBody.status;
    priority = requestBody.priority;
    category = requestBody.category;
    dueDate = requestBody.dueDate;
    todo = requestBody.todo;
  }

  const isStatus =
    status === "TO DO" || status === "IN PROGRESS" || status === "DONE";
  const isPriority =
    priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
  const isCategory =
    category === "WORK" || category === "LEARNING" || category === "HOME";

  if (Object.keys(requestBody).length === 0) {
    switch (true) {
      case status !== undefined:
        if (isStatus) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case priority !== undefined:
        if (isPriority) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case category !== undefined:
        if (isCategory) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
        break;
      case due_date !== undefined:
        let isValidDate = isValid(new Date(due_date));
        if (isValidDate) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
        break;
      default:
        next();
        break;
    }
  }

  if (Object.keys(requestBody).length !== 0) {
    let a;
    let b;
    let c;
    let d;

    if (status !== undefined) {
      if (isStatus) {
        a = true;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    }

    if (priority !== undefined) {
      if (isPriority) {
        b = true;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    }

    if (category !== undefined) {
      if (isCategory) {
        c = true;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    }

    if (dueDate !== undefined) {
      let isDateValid = isValid(new Date(dueDate));
      if (isDateValid) {
        d = true;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    }

    if (Object.keys(request.params).length === 0) {
      if (a && b && c && d && todo !== undefined) {
        next();
      }
    }

    if (Object.keys(request.params).length !== 0) {
      if (a || b || c || d || todo !== undefined) {
        next();
      }
    }
  }
};

const DBValueToResponseValue = (dbValue) => {
  return {
    id: dbValue.id,
    todo: dbValue.todo,
    category: dbValue.category,
    priority: dbValue.priority,
    status: dbValue.status,
    dueDate: dbValue.due_date,
  };
};

app.get("/todos/", isInvalidProperty, async (request, response) => {
  const { search_q = "", status, priority, category, due_date } = request.query;
  let selectTodoQuery;
  let all =
    status === undefined && priority === undefined && category === undefined;

  switch (true) {
    case all && due_date === undefined:
      console.log(`search_q = ""`);
      selectTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%'`;
      break;
    case all:
      console.log("Only Due Date");
      selectTodoQuery = `SELECT * FROM todo WHERE due_date = '${due_date}'`;
      break;
    case priority === undefined && category === undefined:
      console.log("Only Status");
      selectTodoQuery = `SELECT * FROM todo WHERE status = '${status}'`;
      break;
    case status === undefined && category === undefined:
      console.log("Only Priority");
      selectTodoQuery = `SELECT * FROM todo WHERE priority = '${priority}'`;
      break;
    case status === undefined && priority === undefined:
      console.log("Only Category");
      selectTodoQuery = `SELECT * FROM todo WHERE category = '${category}';`;
      break;
    case priority !== undefined && status !== undefined:
      console.log("Priority & Status");
      selectTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND priority = '${priority}';`;
      break;
    case category !== undefined && status !== undefined:
      console.log("Category & Status");
      selectTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND category = '${category}';`;
      break;
    case category !== undefined && priority !== undefined:
      console.log("Category & Priority");
      selectTodoQuery = `SELECT * FROM todo WHERE category = '${category}' AND priority = '${priority}';`;
  }
  const todoArray = await db.all(selectTodoQuery);
  response.send(todoArray.map((each) => DBValueToResponseValue(each)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getUnqTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getUnqTodoQuery);
  response.send(DBValueToResponseValue(todo));
});

const isDateValid = (request, response, next) => {
  const { date } = request.query;
  if (date !== undefined) {
    let isDateValid = isValid(new Date(date));
    if (isDateValid) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
};

app.get("/agenda/", isDateValid, async (request, response) => {
  const { date } = request.query;
  const formated = format(new Date(date), "yyyy-MM-dd");
  console.log(formated);
  const getUnqDateQuery = `SELECT * FROM todo WHERE due_date = '${formated}'`;
  const todo = await db.all(getUnqDateQuery);
  response.send(todo.map((each) => DBValueToResponseValue(each)));
});

app.post("/todos/", isInvalidProperty, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
    INSERT INTO
        todo(id, todo, priority, status, category, due_date)
    VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", isInvalidProperty, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  let updateTodoQuery = `
      UPDATE
          todo
      SET
          status = '${status}',
          priority = '${priority}',
          category = '${category}',
          todo = '${todo}',
          due_date = '${dueDate}'
      WHERE
          id = '${todoId}';`;
  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
