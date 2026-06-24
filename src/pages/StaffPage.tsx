import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { createUser, updateUser, useUsers, type UserInput } from '../api/users.api';
import { useStores } from '../api/stores.api';
import type { Role, StaffUser } from '../types';

interface FormValues {
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  storeId?: string | null;
  isActive?: boolean;
}

export function StaffPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useUsers();
  const { data: stores } = useStores();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [form] = Form.useForm<FormValues>();
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'AGENT', isActive: true } as FormValues);
    setOpen(true);
  };
  const openEdit = (u: StaffUser) => {
    setEditing(u);
    form.setFieldsValue({
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? undefined,
      storeId: u.storeId ?? undefined,
      isActive: u.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        const patch: Partial<UserInput> & { isActive?: boolean } = {
          name: v.name,
          role: v.role,
          phone: v.phone,
          storeId: v.role === 'AGENT' ? v.storeId ?? null : null,
          isActive: v.isActive,
        };
        if (v.password) patch.password = v.password;
        await updateUser(editing.id, patch);
      } else {
        await createUser({
          name: v.name,
          email: v.email,
          password: v.password,
          role: v.role,
          phone: v.phone,
          storeId: v.role === 'AGENT' ? v.storeId ?? null : null,
        });
      }
      message.success(editing ? 'Staff updated' : 'Staff created');
      setOpen(false);
      refresh();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const columns: ColumnsType<StaffUser> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, u) => (
        <div>
          <div style={{ fontWeight: 600 }}>{u.name}</div>
          <Typography.Text type="secondary">{u.email}</Typography.Text>
        </div>
      ),
    },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (r: Role) => <Tag color={r === 'ADMIN' ? 'purple' : 'blue'}>{r}</Tag> },
    {
      title: 'Store',
      key: 'store',
      render: (_, u) => (u.store ? <Tag>{u.store.city}</Tag> : <Typography.Text type="secondary">—</Typography.Text>),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (a: boolean) => (a ? <Tag color="green">Active</Tag> : <Tag color="red">Disabled</Tag>),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, u) => (
        <Button size="small" type="link" onClick={() => openEdit(u)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Staff"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New staff
        </Button>
      }
    >
      <Table<StaffUser>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={users ?? []}
        pagination={false}
      />

      <Modal
        title={editing ? 'Edit staff' : 'New staff'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText={editing ? 'Save' : 'Create'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Field Agent" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="agent@nhstyx.com" disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? 'Reset password (optional)' : 'Password'}
            rules={editing ? [{ min: 8 }] : [{ required: true, min: 8 }]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'AGENT', label: 'Agent' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
              />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="90000 00000" />
            </Form.Item>
          </Space>
          <Form.Item
            noStyle
            shouldUpdate={(p, c) => p.role !== c.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'AGENT' ? (
                <Form.Item name="storeId" label="Store" rules={[{ required: true, message: 'Agents need a store' }]}>
                  <Select
                    placeholder="Assign a store"
                    options={(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.city})` }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
