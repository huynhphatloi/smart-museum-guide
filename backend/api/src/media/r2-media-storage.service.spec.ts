import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AppConfig, R2Config } from '../config/env.validation';
import { MediaStorageService } from './media-storage.service';
import { R2MediaStorageService, r2KeyFromUrl } from './r2-media-storage.service';

describe('R2 media storage', () => {
  const r2: R2Config = {
    accountId: 'account',
    accessKeyId: 'key-id',
    secretAccessKey: 'secret',
    bucket: 'museum-media',
    publicUrl: 'https://media.example.com',
  };
  const config = { maxUploadSizeBytes: 1024 } as AppConfig;

  function setup() {
    const send = jest.fn().mockResolvedValue({});
    const legacy = { save: jest.fn(), remove: jest.fn() } as unknown as MediaStorageService;
    const storage = new R2MediaStorageService(config, r2, legacy, { send } as unknown as S3Client);
    return { send, legacy, storage };
  }

  const narration = {
    originalname: 'EX-001-en.mp3',
    mimetype: 'audio/mpeg',
    size: 3,
    buffer: Buffer.from('mp3'),
  };

  it('uploads narration under audio/ and returns its public R2 URL', async () => {
    const { send, storage } = setup();

    const stored = await storage.save(narration, 'audio');

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'museum-media',
      ContentType: 'audio/mpeg',
      Body: narration.buffer,
    });
    expect(command.input.Key).toMatch(/^audio\/[0-9a-f-]{36}\.mp3$/);
    expect(stored.url).toBe(`https://media.example.com/${command.input.Key}`);
  });

  it('applies the same file rules as local storage', async () => {
    const { send, storage } = setup();

    await expect(storage.save({ ...narration, size: 2048 })).rejects.toThrow('MB limit');
    await expect(storage.save({ ...narration, mimetype: 'text/plain' })).rejects.toThrow(
      'Unsupported file type',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('deletes objects it produced', async () => {
    const { send, storage } = setup();

    await storage.remove('https://media.example.com/audio/abc.mp3');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: 'museum-media', Key: 'audio/abc.mp3' });
  });

  it('removes media saved before the switch from local disk', async () => {
    const { send, legacy, storage } = setup();

    await storage.remove('/uploads/audio/old.mp3');

    expect(legacy.remove).toHaveBeenCalledWith('/uploads/audio/old.mp3');
    expect(send).not.toHaveBeenCalled();
  });

  it('never deletes URLs outside its bucket', async () => {
    const { send, storage } = setup();

    await storage.remove('https://elsewhere.example.com/audio/abc.mp3');
    await storage.remove('https://media.example.com/../secrets');

    expect(send).not.toHaveBeenCalled();
  });

  it('maps only well-formed bucket URLs back to keys', () => {
    expect(r2KeyFromUrl(r2.publicUrl, 'https://media.example.com/images/a.jpg')).toBe(
      'images/a.jpg',
    );
    expect(
      r2KeyFromUrl(r2.publicUrl, 'https://media.example.com.evil.com/images/a.jpg'),
    ).toBeNull();
    expect(r2KeyFromUrl(r2.publicUrl, 'https://media.example.com/images/nested/a.jpg')).toBeNull();
  });
});
