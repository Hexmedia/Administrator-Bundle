<?php

namespace Hexmedia\AdministratorBundle\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class DashboardControllerTest extends WebTestCase
{
    public function testDashboard()
    {
        $client = static::createClient();

        $crawler = $client->request('GET', '/dashboard');
    }

}
