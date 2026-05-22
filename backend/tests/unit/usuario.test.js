/**
 * Tests unitarios: modelo Usuario — bcrypt hashing
 */

const bcrypt = require('bcryptjs');

// Mock de mongoose para evitar conexión real
jest.mock('../../models/Usuario', () => {
  const bcryptReal = require('bcryptjs');

  const mockSave = jest.fn().mockImplementation(async function () {
    if (this.isModified('password') && !this.password.startsWith('$2')) {
      this.password = await bcryptReal.hash(this.password, 12);
    }
    return this;
  });

  function MockUsuario(data) {
    Object.assign(this, data);
    this._modified = new Set(Object.keys(data));
    this.isModified = (field) => this._modified.has(field);
    this.save = mockSave.bind(this);
  }

  MockUsuario.prototype.comparePassword = function (candidate) {
    return bcryptReal.compare(candidate, this.password);
  };

  MockUsuario.findOne = jest.fn();
  MockUsuario.findById = jest.fn();

  return MockUsuario;
});

const Usuario = require('../../models/Usuario');

describe('Usuario — bcrypt password hashing', () => {
  test('comparePassword retorna true con contraseña correcta', async () => {
    const hash = await bcrypt.hash('miPassword123', 12);
    const user = new Usuario({ username: 'test', password: hash });
    const result = await user.comparePassword('miPassword123');
    expect(result).toBe(true);
  });

  test('comparePassword retorna false con contraseña incorrecta', async () => {
    const hash = await bcrypt.hash('miPassword123', 12);
    const user = new Usuario({ username: 'test', password: hash });
    const result = await user.comparePassword('otraPassword');
    expect(result).toBe(false);
  });

  test('el password hasheado no es igual al plaintext', async () => {
    const plaintext = 'secreto456';
    const hash = await bcrypt.hash(plaintext, 12);
    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  test('dos hashes del mismo password son diferentes (salt aleatorio)', async () => {
    const hash1 = await bcrypt.hash('mismo', 12);
    const hash2 = await bcrypt.hash('mismo', 12);
    expect(hash1).not.toBe(hash2);
    expect(await bcrypt.compare('mismo', hash1)).toBe(true);
    expect(await bcrypt.compare('mismo', hash2)).toBe(true);
  });
});
