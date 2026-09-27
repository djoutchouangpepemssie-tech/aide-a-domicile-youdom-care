import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelScheduledFrame, pendingFrameJobs, resetFrames, scheduleFrame } from "./frame";

/** Images contrôlées : `tick()` joue les rappels en attente, comme le navigateur. */
function installFrames() {
  const queue: FrameRequestCallback[] = [];
  const request = vi.fn((callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return { request, cancel, tick: () => queue.splice(0).forEach((callback) => callback(0)) };
}

describe("images groupées", () => {
  beforeEach(() => resetFrames());

  afterEach(() => {
    resetFrames();
    vi.unstubAllGlobals();
  });

  it("ne demande qu'une image pour plusieurs travaux, dans l'ordre", () => {
    const frames = installFrames();
    const done: string[] = [];
    scheduleFrame(() => done.push("un"));
    scheduleFrame(() => done.push("deux"));
    scheduleFrame(() => done.push("trois"));
    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(pendingFrameJobs()).toBe(3);
    frames.tick();
    expect(done).toEqual(["un", "deux", "trois"]);
    expect(pendingFrameJobs()).toBe(0);
  });

  it("ne joue qu'une fois un travail programmé plusieurs fois entre deux images", () => {
    const frames = installFrames();
    const job = vi.fn();
    scheduleFrame(job);
    scheduleFrame(job);
    scheduleFrame(job);
    expect(frames.request).toHaveBeenCalledTimes(1);
    frames.tick();
    expect(job).toHaveBeenCalledTimes(1);
  });

  it("redemande une image après avoir joué", () => {
    const frames = installFrames();
    const job = vi.fn();
    scheduleFrame(job);
    frames.tick();
    scheduleFrame(job);
    expect(frames.request).toHaveBeenCalledTimes(2);
    frames.tick();
    expect(job).toHaveBeenCalledTimes(2);
  });

  it("annule le travail et libère l'image quand il ne reste rien (démontage)", () => {
    const frames = installFrames();
    const job = vi.fn();
    const other = vi.fn();
    scheduleFrame(job);
    scheduleFrame(other);
    cancelScheduledFrame(job);
    // Il reste `other` : l'image ne doit pas être annulée.
    expect(frames.cancel).not.toHaveBeenCalled();
    cancelScheduledFrame(other);
    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(pendingFrameJobs()).toBe(0);
    frames.tick();
    expect(job).not.toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
  });

  it("annuler un travail inconnu ne fait rien", () => {
    const frames = installFrames();
    cancelScheduledFrame(() => {});
    expect(frames.cancel).not.toHaveBeenCalled();
  });
});
