import app from '../server';
import request from 'supertest';
import { expect } from 'chai';
import { describe } from "node:test";
import { it } from "node:test";

describe('UserController Endpoints tests', () => {

  it('POST /api/v1/user/register should create a new user', async () => {
    const user = { firstname: 'Ibrahim', lastname:"Mneimneh" };
    const res = await request(app)
      .post('/api/v1/user/register')
      .send(user)
      .set('Content-Type', 'application/json');
    
    expect(res.status).to.equal(201);
    expect(res.body.message).to.equal("User registered Successfully");  
  });

  it('POST /api/v1/user/register with an empty object should return 400 ', async () => {
    const res = await request(app).post('/api/v1/user/register').send({});
    
    expect(res.status).to.equal(400);  
    expect(res.body).to.have.property('message').that.equals('Validation failed');
  });
});
