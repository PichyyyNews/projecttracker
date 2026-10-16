"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  Badge,
  LayerCard,
  Table,
} from "@cloudflare/kumo";
import {
  Plus,
  MagnifyingGlass,
  Kanban,
  CheckCircle,
  Database,
  ArrowSquareOut,
  FolderOpen,
} from "@phosphor-icons/react";

interface ProjectItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
  tier: string;
  createdAt: string;
}

const mockProjects: ProjectItem[] = [
  {
    id: 1,
    name: "edge-api-gateway",
    description: "Cloudflare worker based edge API reverse proxy",
    status: "active",
    tier: "enterprise",
    createdAt: "2026-10-15",
  },
  {
    id: 2,
    name: "auth-session-manager",
    description: "JWT verification & Redis session token validator",
    status: "active",
    tier: "standard",
    createdAt: "2026-10-14",
  },
  {
    id: 3,
    name: "data-sync-pipeline",
    description: "PostgreSQL to Clickhouse CDC streaming worker",
    status: "paused",
    tier: "standard",
    createdAt: "2026-10-12",
  },
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectList, setProjectList] = useState<ProjectItem[]>(mockProjects);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filteredProjects = projectList.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProject: ProjectItem = {
      id: Date.now(),
      name: newName.trim(),
      description: newDesc.trim() || null,
      status: "active",
      tier: "standard",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setProjectList([newProject, ...projectList]);
    setNewName("");
    setNewDesc("");
    setIsCreating(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-kumo-brand text-white">
              <Kanban weight="thin" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-kumo-default">Project Tracker</span>
              <span className="text-xs text-kumo-subtle">Cloudflare Kumo UI + PostgreSQL</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-kumo-subtle">
              <Database weight="thin" size={16} />
              <span>PostgreSQL Connected</span>
            </div>
            <Badge variant="success">Online</Badge>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Page Header Block */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-kumo-default">Projects overview</h1>
              <Badge variant="neutral">{filteredProjects.length} total</Badge>
            </div>
            <p className="text-sm text-kumo-subtle">
              Manage your engineering projects, deployments, and database status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setIsCreating(!isCreating)}
            >
              <Plus weight="thin" size={16} className="mr-1.5" />
              <span>Create project</span>
            </Button>
          </div>
        </div>

        {/* Quick Add Form Section */}
        {isCreating && (
          <div className="mb-6">
            <LayerCard className="p-5 ring ring-kumo-line">
              <form onSubmit={handleAddProject} className="grid gap-4">
                <div className="grid gap-1.5">
                  <h2 className="text-base font-semibold text-kumo-default">Create new project</h2>
                  <p className="text-xs text-kumo-subtle">
                    Enter the name and description for your tracking project.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Project name (e.g. storage-indexer)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Short description"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save project
                  </Button>
                </div>
              </form>
            </LayerCard>
          </div>
        )}

        {/* Resource List Block */}
        <div className="grid gap-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                <MagnifyingGlass weight="thin" size={16} />
              </div>
              <input
                type="text"
                className="w-full rounded-md border border-kumo-line bg-kumo-control py-1.5 pl-9 pr-3 text-sm text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                placeholder="Search projects by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-xs text-kumo-subtle">
              Showing {filteredProjects.length} of {projectList.length} items
            </div>
          </div>

          {/* Table Container Card */}
          <LayerCard className="overflow-hidden ring ring-kumo-line">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Project name</Table.Head>
                  <Table.Head>Description</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Tier</Table.Head>
                  <Table.Head>Created</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredProjects.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderOpen weight="thin" size={32} className="text-kumo-subtle" />
                        <span className="font-medium text-kumo-default">No projects found</span>
                        <span className="text-xs text-kumo-subtle">
                          Try adjusting your search criteria or create a new project.
                        </span>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredProjects.map((project) => (
                    <Table.Row key={project.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <CheckCircle weight="thin" size={16} className="text-kumo-brand" />
                          <span className="font-medium text-kumo-default">{project.name}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-kumo-subtle">
                        {project.description || "—"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          variant={project.status === "active" ? "success" : "neutral"}
                        >
                          {project.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="font-mono text-[0.9em] text-kumo-subtle">
                          {project.tier}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="text-kumo-subtle">{project.createdAt}</Table.Cell>
                      <Table.Cell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ArrowSquareOut weight="thin" size={16} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </LayerCard>
        </div>
      </main>

      {/* Hairline Sticky Footer */}
      <footer className="border-t border-kumo-line bg-kumo-base px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-kumo-subtle">
          <div>Built with Cloudflare Kumo UI & Phosphor Thin Icons</div>
          <div>Drizzle ORM &bull; PostgreSQL</div>
        </div>
      </footer>
    </div>
  );
}
