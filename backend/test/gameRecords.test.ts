import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('game records', () => {
  it('stores the first record and reports isRecord: true', async () => {
    const agent = createAgent()
    await signUp(agent, 'g1@test.dev')
    const res = await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 12 })
    expect(res.status).toBe(200)
    expect(res.body.isRecord).toBe(true)
  })

  it('does not overwrite a better existing record (memory: fewer is better)', async () => {
    const agent = createAgent()
    await signUp(agent, 'g2@test.dev')
    await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 12 })
    const res = await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 20 })
    expect(res.body.isRecord).toBe(false)
  })

  it('treats snake as higher-is-better', async () => {
    const agent = createAgent()
    await signUp(agent, 'g3@test.dev')
    await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 10 })
    const worse = await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 8 })
    expect(worse.body.isRecord).toBe(false)
    const better = await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 15 })
    expect(better.body.isRecord).toBe(true)
  })

  it('keeps records per user separate', async () => {
    const agentA = createAgent()
    await signUp(agentA, 'g4a@test.dev')
    await agentA.put('/api/game-records').send({ game: 'minesweeper', difficulty: 'easy', value: 30 })

    const agentB = createAgent()
    await signUp(agentB, 'g4b@test.dev')
    const res = await agentB.put('/api/game-records').send({ game: 'minesweeper', difficulty: 'easy', value: 60 })
    expect(res.body.isRecord).toBe(true) // B's own first record, not compared with A's
  })
})
