import Redis from 'ioredis';

const getRedisUrl = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    return null;
};

// Global augmentation
declare global {
    var redis: Redis | any | undefined;
}

class MockRedis {
    private store: Map<string, any>;

    constructor() {
        this.store = new Map();
        console.log('Using In-Memory Mock Redis');
    }

    async get(key: string): Promise<string | null> {
        const val = this.store.get(key);
        return typeof val === 'string' ? val : null;
    }

    async set(key: string, value: string, ...args: any[]): Promise<string> {
        this.store.set(key, value);
        return 'OK';
    }

    async del(key: string): Promise<number> {
        return this.store.delete(key) ? 1 : 0;
    }
    
    // List operations for Matchmaking
    async rpop(key: string): Promise<string | null> {
        const list = this.store.get(key);
        if (Array.isArray(list) && list.length > 0) {
            // Modifies the array in place in the map
            return list.pop() || null;
        }
        return null;
    }

    async lpush(key: string, ...values: string[]): Promise<number> {
        let list = this.store.get(key);
        if (!Array.isArray(list)) {
            list = [];
            this.store.set(key, list);
        }
        // Redis lpush prepends
        list.unshift(...values);
        return list.length;
    }

    async lrem(key: string, count: number, element: string): Promise<number> {
        const list = this.store.get(key);
        if (!Array.isArray(list)) return 0;
        
        // Simplified implementation: removes all occurrences if count=0 (GameService usage)
        const initialLength = list.length;
        const newList = list.filter(item => item !== element);
        this.store.set(key, newList);
        
        return initialLength - newList.length;
    }

    async lrange(key: string, start: number, end: number): Promise<string[]> {
        const list = this.store.get(key);
        if (!Array.isArray(list)) return [];
        
        // Handle negative end index
        if (end === -1) {
            return list.slice(start);
        }
        return list.slice(start, end + 1);
    }
}

const redisUrl = getRedisUrl();

// Use MockRedis if no URL is provided
export const redis = global.redis || (redisUrl ? new Redis(redisUrl) : new MockRedis());

if (process.env.NODE_ENV !== 'production') {
    global.redis = redis;
}
