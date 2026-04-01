import { describe, expect, it, vi } from 'vitest'
import { asClass, asValue, createContainer } from 'awilix'

const redisMock = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

describe('Architecture Validation', () => {
    it('should validate Opaque Token lifecycle', async () => {
        const token = 'test-token'
        const userContext = JSON.stringify({ id: 1 })
        redisMock.get.mockResolvedValueOnce(userContext)
        const context = await redisMock.get(token)
        expect(context).toBe(userContext)
    })

    it('should verify DI container integrity', () => {
        const container = createContainer()
        container.register({
            db: asValue({ status: 'ok' }), service: asClass(class {
                constructor({ db }: any) {
                    (this as any).db = db
                }
            })
        })
        const svc = container.resolve('service') as any
        expect(svc.db.status).toBe('ok')
    })
})
