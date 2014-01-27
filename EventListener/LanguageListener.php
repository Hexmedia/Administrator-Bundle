<?php
/**
 * Created by PhpStorm.
 * User: krun
 * Date: 08.01.14
 * Time: 12:29
 */

namespace Hexmedia\AdministratorBundle\EventListener;


use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class LanguageListener
{
    /**
     * @var \Symfony\Component\HttpFoundation\Session\Session
     */
    private $session;
    /**
     * @var \Symfony\Component\DependencyInjection\ContainerInterface
     */
    private $container;

    public function __construct(Session $session, ContainerInterface $container)
    {
        $this->session = $session;
        $this->container = $container;
    }

    public function setLocale(GetResponseEvent $event)
    {
        if (HttpKernelInterface::MASTER_REQUEST !== $event->getRequestType()) {
            return;
        }

        $request = $event->getRequest();

        if ($this->session->get('locale')) {
            $request->setLocale($this->session->get("locale"));
        } else {
            $request->setLocale($request->getPreferredLanguage($this->container->getParameter("locales")));
        }

    }
} 