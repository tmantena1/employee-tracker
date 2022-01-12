const inquirer = require("inquirer");
const mysql = require("mysql2");
const cTable = require('console.table');

// Establish connection to database
const db = mysql.createConnection({
  host: "localhost",
  // Enter MySQL username here
  user: "root",
  // ENter MySQL password here
  password: "password",
  database: "company_db",
});
db.connect(function (err) {});

// Questions for user
const initialPrompt = [
  {
    type: "list",
    name: "task",
    message: "Choose an action:",
    choices: [
      "View All Employees",
      "Add Employee",
      "Update Employee Role",
      "View All Roles",
      "Add Role",
      "View All Departments",
      "Add Department",
      "Quit"
    ],
  },
];


// View Departments
const viewDepartments = () => {
  db.query(`select id as 'ID', name as 'Department Name' from departments`, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.table(data);
    console.log("Press up or down arrow to continue");
  });
};

// View Roles 
const viewRoles = () => {
  db.query(`
  select 
  r.id as 'ID', 
  r.title as 'Title', 
  d.name as 'Department Name', 
  r.salary as 'Salary'  
  from 
  roles r 
  join 
  departments d on r.department_id = d.id
  order by r.id
  `, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.table(data);
    console.log("Press up or down arrow to continue");
  });
};

//View Employees
const viewEmployees = () => {
  db.query(`
  select 
  e.id as 'ID',
  e.first_name as 'First Name',
  e.last_name as 'Last Name',
  r.title as 'Title',
  d.name as 'Department',
  r.salary as 'Salary',
  concat (em.first_name, ' ', em.last_name) as 'Manager'
  from 
  employees e
  join roles r on r.id = e.role_id
  join departments d on d.id = r.department_id
  left join employees em on e.manager_id = em.id
  `, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.table(data);
    console.log("Press up or down arrow to continue");
  });
};

//Add Department
const addDepartment = (department) => {
  db.query(`insert into departments(name) value (?)`, [department],
    (err, data) => {
      if (err) {
        console.log(err);
      }
      db.query(`select * from departments`, (err, data) => {
        if (err) {
          console.log(err);
        }
        console.table(data);
        console.log("Press up or down arrow to continue");
      });
    });
};

//Add Role
const addRole = (role) => {
  db.query(`select id from departments where name=?`, [role.department], (err, result) => {
      const departmentID = result[0].id;
      db.query(`insert into roles (title, salary, department_id) value (?, ?, ?)`, [role.roleName, role.salary, departmentID],
        (err, data) => {
          if (err) {
            console.log(err);
          }
          viewRoles();
          console.log("Press up or down arrow to continue");
        });
    });
};

//Add Employee
const addEmployee = (employee) => {
  db.query(`select id from roles where title=?`, [employee.role], (err, result) => {
      const roleID = result[0].id;
      db.query(`select id from employees where concat(first_name, ' ', last_name) = ?`, [employee.manager], (err, result2) => {
          const managerID = result2[0].id;
          console.log(managerID);
          db.query(`insert into employees (first_name, last_name, role_id, manager_id) value (?, ?, ?, ?)`, [employee.firstName, employee.lastName, roleID, managerID],
            (err, data) => {
              if (err) {
                console.log(err);
              }
              viewEmployees();
              console.log("Press up or down arrow to continue");
            });
        });
    });
};

//Update Employee
const updateEmployee = (employee) => {
  db.query(`select id from employees where concat(first_name, ' ', last_name) = ?`, [employee.employee], (err, result) => {
    const employeeID = result[0].id;
    db.query(`select * from roles where title=?`, [employee.role], (err, result2) => {
      const roleID = result2[0].id;
      db.query(`update employees set role_id = ? where id = ?`, [roleID, employeeID], (err, data) => {
        if(err) {
          console.log(err);
        }
      })
    })
  })
};

//Start App
const startEmployeeManager = async () => {
  const selection = await inquirer.prompt(initialPrompt);
  viewSelectedAction(selection.task);
};

// Logic for user answers
const viewSelectedAction = async (answer) => {
  switch (answer) {
  case "View All Departments":
    viewDepartments();
    startEmployeeManager();
    break;

   case "View All Roles":
    viewRoles();
    startEmployeeManager();
    break;

  case "View All Employees":
    viewEmployees();
    startEmployeeManager();
    break;

  case "Add Department":
    const addDepartmentQuestion = [
      {
        type: "input",
        name: "addDepartment",
        message: "Enter the name of the department you would like to add:",
      },
    ];
    const newDepartment = await inquirer.prompt(addDepartmentQuestion);
    addDepartment(newDepartment.addDepartment);
    startEmployeeManager();
    break;

  case "Add Role":
    const [dbDepartments] = await db.promise().query("select * from departments");
    const departments = dbDepartments.map((dept) => ({
      id: dept.id,
      name: dept.name,
    }));

    const addRoleQuestions = [
      {
        type: "input",
        name: "roleName",
        message: "Enter the name of the role you would like to add:",
      },
      {
        type: "input",
        name: "salary",
        message: "Enter the salary for the role:",
      },
      {
        type: "list",
        name: "department",
        message: "Choose a department for the role:",
        choices: departments,
      },
    ];
    const newRole = await inquirer.prompt(addRoleQuestions);
    addRole(newRole);
    startEmployeeManager();
    break;

  case "Add Employee":
    const [dbRoles] = await db.promise().query(`select * from roles`);
    const roles = dbRoles.map((role) => {return role.title;});

    const [dbManager] = await db.promise().query(`select concat(first_name, ' ', last_name) as manager from employees`);
    const manager = dbManager.map((mgr) => {return mgr.manager;});

    const addEmployeeQuestions = [
      {
        type: "input",
        name: "firstName",
        message: "Enter the new employee's first name:",
      },
      {
        type: "input",
        name: "lastName",
        message: "Enter the new employee's last name:",
      },
      {
        type: "list",
        name: "role",
        message: "Select a role for the new employee:",
        choices: roles,
      },
      {
        type: "list",
        name: "manager",
        message: "Select a manager for the new employee:",
        choices: manager,
      },
    ];

    const newEmployee = await inquirer.prompt(addEmployeeQuestions);
    addEmployee(newEmployee);
    startEmployeeManager();
    break;

  case "Update Employee Role":
    const [dbEmployees] = await db.promise().query(`select concat(first_name, ' ', last_name) as employee from employees`);
    const employees = dbEmployees.map(emp => {return emp.employee})

    const [dbRoles1] = await db.promise().query(`select * from roles`);
    const roles1 = dbRoles1.map((role1) => {return role1.title;});
    const updateEmployeeQuestions = [
      {
        type: "list",
        name: "employee",
        message: "Select an employee to update:",
        choices: employees
      },
      {
        type: "list",
        name: "role",
        message: "Which role do you want to assign the selected employee?",
        choices: roles1
      },
    ];

    const updatedEmployee = await inquirer.prompt(updateEmployeeQuestions);
    updateEmployee(updatedEmployee);
    console.log("Employee record successfully updated");
    startEmployeeManager();
    break;

  case "Quit":
    process.exit();
    break;
  }
};

function init() {
  startEmployeeManager();
}

init();
