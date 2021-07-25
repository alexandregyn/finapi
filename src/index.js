const { request, response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

//Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.params;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({ error: 'Customer not found' });
  }
  request.customer = customer;
  return next();
}

function getBalance(statement) {
  return statement.reduce((sum, operation) => operation.type === 'credit' ? 
    sum + operation.amount : sum - operation.amount ,0);
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some((custommer) => custommer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({ error: 'Customer already exists!' });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });
  return response.status(201).send();
});

app.get('/statement/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.post('/deposit/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  };

  customer.statement.push(statementOperation);
  
  return response.status(201).send();
});

app.post('/withdraw/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  };

  customer.statement.push(statementOperation);
  
  return response.status(201).send();
});

app.get('/statement/date/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;
  const dateFormat = new Date(date + ' 00:00');
  const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString());
  return response.json(statement);
});

app.put('/account/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;
  customer.name = name;
  return response.status(201).send();
});

app.get('/account/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.status(201).json(customer);
});

app.delete('/account/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  customers.splice(customer, 1);
  return response.status(200).send();
});

app.get('/balance/:cpf', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.status(201).json(getBalance(customer.statement));
});

app.listen(3333);