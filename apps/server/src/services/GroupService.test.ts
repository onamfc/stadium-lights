import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupService } from './GroupService';
import { InMemoryGroupRepository } from '../repositories/InMemoryGroupRepository';
import { ZoneService } from './ZoneService';
import { StadiumBounds } from '@stadium-lights/shared';

describe('GroupService', () => {
  let groupService: GroupService;
  let groupRepository: InMemoryGroupRepository;
  let zoneService: ZoneService;

  const mockStadiumBounds: StadiumBounds = {
    topLeft: { latitude: 40.7590, longitude: -73.9850 },
    topRight: { latitude: 40.7590, longitude: -73.9820 },
    bottomLeft: { latitude: 40.7560, longitude: -73.9850 },
    bottomRight: { latitude: 40.7560, longitude: -73.9820 },
  };

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    zoneService = new ZoneService();
    groupService = new GroupService(groupRepository, zoneService);
  });

  describe('createGroup', () => {
    it('should create a group with generated code', async () => {
      const { group, code } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      expect(group).toBeDefined();
      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(group.controllerDeviceId).toBe('device-123');
      expect(group.isCustomCode).toBe(false);
    });

    it('should create a group with custom code', async () => {
      const { group, code } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
        customCode: 'MYCODE',
      });

      expect(code).toBe('MYCODE');
      expect(group.isCustomCode).toBe(true);
    });

    it('should enforce group limit per controller', async () => {
      // Create 3 groups (the limit)
      for (let i = 0; i < 3; i++) {
        await groupService.createGroup({
          controllerDeviceId: 'device-123',
          stadiumBounds: mockStadiumBounds,
        });
      }

      // Fourth group should fail
      await expect(
        groupService.createGroup({
          controllerDeviceId: 'device-123',
          stadiumBounds: mockStadiumBounds,
        })
      ).rejects.toThrow(/only have 3 active groups/);
    });

    it('should allow different controllers to have their own groups', async () => {
      await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      await groupService.createGroup({
        controllerDeviceId: 'device-456',
        stadiumBounds: mockStadiumBounds,
      });

      const count1 = await groupService.getGroupCountByController('device-123');
      const count2 = await groupService.getGroupCountByController('device-456');

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('should create zones for the group', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
        gridSize: { rows: 5, cols: 5 },
      });

      const zones = groupService.getGroupZones(group.id);
      expect(zones.length).toBe(25); // 5 x 5 grid
    });
  });

  describe('joinGroup', () => {
    it('should join an existing group by code', async () => {
      const { code } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const group = await groupService.joinGroup(code);

      expect(group).toBeDefined();
      expect(group?.code).toBe(code);
    });

    it('should return null for non-existent code', async () => {
      const group = await groupService.joinGroup('INVALID');
      expect(group).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const { code } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
        customCode: 'TESTCODE',
      });

      const group = await groupService.joinGroup('testcode');

      expect(group).toBeDefined();
      expect(group?.code).toBe('TESTCODE');
    });
  });

  describe('isController', () => {
    it('should return true for the controller device', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const isController = await groupService.isController(group.id, 'device-123');
      expect(isController).toBe(true);
    });

    it('should return false for non-controller device', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const isController = await groupService.isController(group.id, 'device-456');
      expect(isController).toBe(false);
    });
  });

  describe('releaseGroup', () => {
    it('should release a group as controller', async () => {
      const { group, code } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const result = await groupService.releaseGroup(group.id, 'device-123');

      expect(result).toBe(true);

      // Group should no longer be joinable
      const joinedGroup = await groupService.joinGroup(code);
      expect(joinedGroup).toBeNull();
    });

    it('should not allow non-controller to release group', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const result = await groupService.releaseGroup(group.id, 'device-456');
      expect(result).toBe(false);
    });
  });

  describe('getGroupsByController', () => {
    it('should return all groups for a controller', async () => {
      await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const groups = await groupService.getGroupsByController('device-123');
      expect(groups.length).toBe(2);
    });

    it('should return empty array for controller with no groups', async () => {
      const groups = await groupService.getGroupsByController('no-groups-device');
      expect(groups).toEqual([]);
    });
  });

  describe('resumeGroup', () => {
    it('should resume a group and refresh expiration', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const originalExpiration = group.expiresAt;

      // Wait a tiny bit to ensure time has passed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const resumed = await groupService.resumeGroup(group.id, 'device-123');

      expect(resumed).toBeDefined();
      expect(resumed!.expiresAt.getTime()).toBeGreaterThan(originalExpiration.getTime());
    });

    it('should return null for non-controller', async () => {
      const { group } = await groupService.createGroup({
        controllerDeviceId: 'device-123',
        stadiumBounds: mockStadiumBounds,
      });

      const resumed = await groupService.resumeGroup(group.id, 'device-456');
      expect(resumed).toBeNull();
    });
  });
});
