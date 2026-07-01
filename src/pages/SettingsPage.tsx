import { useEffect } from 'react';
import { Button, Card, Col, Divider, Form, Input, Row, Typography, message } from 'antd';
import { useSettings, useUpdateSettings, type BusinessSettings } from '../api/settings.api';

export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [form] = Form.useForm<BusinessSettings>();

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  const save = async () => {
    const values = await form.validateFields();
    try {
      await update.mutateAsync(values);
      message.success('Settings saved');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to save settings');
    }
  };

  return (
    <Card
      title="Business settings"
      loading={isLoading}
      extra={
        <Button type="primary" loading={update.isPending} onClick={save}>
          Save changes
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">
        These details appear on GST invoices and customer-facing communication.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Divider orientation="left">Company</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="businessName" label="Legal business name">
              <Input placeholder="NH Styx Garments Pvt Ltd" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="gstin" label="GSTIN">
              <Input placeholder="27ABCDE1234F1Z5" maxLength={20} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="addressLine" label="Address">
          <Input placeholder="Unit 4, Market Yard" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="city" label="City">
              <Input placeholder="Pune" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="state" label="State">
              <Input placeholder="Maharashtra" />
            </Form.Item>
          </Col>
          <Col xs={6} md={4}>
            <Form.Item name="stateCode" label="GST code">
              <Input placeholder="27" maxLength={2} />
            </Form.Item>
          </Col>
          <Col xs={6} md={4}>
            <Form.Item name="pincode" label="PIN">
              <Input placeholder="411001" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Support</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="supportPhone" label="Support phone">
              <Input placeholder="90000 00000" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="supportEmail" label="Support email">
              <Input placeholder="care@nhstyx.com" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Invoice</Divider>
        <Form.Item name="invoiceTerms" label="Terms & conditions" tooltip="Printed on every invoice">
          <Input.TextArea rows={2} placeholder="Payment due within 30 days. Goods once sold…" />
        </Form.Item>
        <Form.Item name="invoiceFooter" label="Invoice footer line">
          <Input placeholder="Thank you for your business." />
        </Form.Item>

        <Divider orientation="left">Bank / payment details</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="bankName" label="Bank name">
              <Input placeholder="HDFC Bank" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="bankAccount" label="Account number">
              <Input placeholder="50200012345678" />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="bankIfsc" label="IFSC">
              <Input placeholder="HDFC0000123" />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="bankUpi" label="UPI ID">
              <Input placeholder="nhstyx@hdfcbank" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
